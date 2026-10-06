import { NextResponse } from "next/server";

// Speaker proposals are emailed to the organizer through a Loops transactional
// email, and the proposer gets a confirmation through a second one.
// One-time setup in the Loops dashboard (Transactional, not Loops):
//   1. "speaker proposal" → to the organizer, data variables
//      {name}, {email}, {proposal}. ID → LOOPS_PROPOSAL_TRANSACTIONAL_ID.
//   2. "proposal received" → to the proposer, data variables
//      {name}, {proposal}. ID → LOOPS_PROPOSAL_CONFIRMATION_TRANSACTIONAL_ID.
// Without (1) the route returns 503 and the form falls back to a pre-filled
// mailto: link so no proposal is lost. (2) is optional: if it's unset or the
// send fails, the proposal still counts as delivered and the error is logged.
const PROPOSAL_INBOX = "kaja.skerlj@gmail.com";
const MAX_PROPOSAL_CHARS = 2000;

async function sendTransactional(
  apiKey: string,
  transactionalId: string,
  to: string,
  dataVariables: Record<string, string>
) {
  const response = await fetch("https://app.loops.so/api/v1/transactional", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transactionalId, email: to, addToAudience: false, dataVariables }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data.success !== false, data };
}

export async function POST(request: Request) {
  try {
    const { name, email, proposal } = await request.json();

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanProposal = typeof proposal === "string" ? proposal.trim() : "";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ error: "enter an email address like name@example.com." }, { status: 400 });
    }
    if (!cleanProposal) {
      return NextResponse.json({ error: "Tell us a little about what you'd show." }, { status: 400 });
    }
    if (cleanProposal.length > MAX_PROPOSAL_CHARS) {
      return NextResponse.json(
        { error: `Keep it under ${MAX_PROPOSAL_CHARS} characters.` },
        { status: 400 }
      );
    }

    const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
    const transactionalId = process.env.LOOPS_PROPOSAL_TRANSACTIONAL_ID;

    if (!LOOPS_API_KEY || !transactionalId) {
      console.error("Proposal email not configured: LOOPS_API_KEY or LOOPS_PROPOSAL_TRANSACTIONAL_ID missing");
      return NextResponse.json(
        { error: "unable to send right now. email to kaja.skerlj@gmail.com instead. thanks!", fallback: "mailto" },
        { status: 503 }
      );
    }

    // 1. To the organizer. This one has to succeed.
    const organizer = await sendTransactional(LOOPS_API_KEY, transactionalId, PROPOSAL_INBOX, {
      name: cleanName || "(no name)",
      email: cleanEmail,
      proposal: cleanProposal,
    });

    if (!organizer.ok) {
      console.error("Loops transactional error:", organizer.data);
      return NextResponse.json(
        { error: "Couldn't send right now.", fallback: "mailto" },
        { status: 502 }
      );
    }

    // 2. Confirmation to the proposer. Best effort.
    const confirmationId = process.env.LOOPS_PROPOSAL_CONFIRMATION_TRANSACTIONAL_ID;
    if (confirmationId) {
      const confirmation = await sendTransactional(LOOPS_API_KEY, confirmationId, cleanEmail, {
        name: cleanName || "there",
        proposal: cleanProposal,
      });
      if (!confirmation.ok) console.error("Loops confirmation error:", confirmation.data);
    }

    return NextResponse.json({ success: true, message: "thanks, i'll read it and get back to you soon." });
  } catch (error) {
    console.error("Proposal error:", error);
    return NextResponse.json({ error: "An unexpected error occurred.", fallback: "mailto" }, { status: 500 });
  }
}
