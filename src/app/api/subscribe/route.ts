import { NextResponse } from "next/server";

// Loops mailing list to add subscribers to (the "design show&tell" list).
const DESIGN_SHOW_AND_TELL_LIST_ID = "cmqax5l0t76pp0jxi18hw5e0o";

// One call does everything: the events API creates the contact if it's new,
// updates it if not, adds it to the list, and fires SIGNUP_EVENT. In Loops,
// a Loop triggered by this event sends the welcome email (set the Loop to
// run once per contact so a second signup doesn't resend it).
const SIGNUP_EVENT = "signup";

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    const cleanEmail = typeof email === "string" ? email.trim() : "";
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "enter an email address like name@example.com." },
        { status: 400 }
      );
    }

    const LOOPS_API_KEY = process.env.LOOPS_API_KEY;

    if (!LOOPS_API_KEY) {
      console.error("LOOPS_API_KEY is not set");
      return NextResponse.json(
        { error: "can't add you right now. try again later." },
        { status: 503 }
      );
    }

    const firstName = typeof name === "string" && name.trim() ? name.trim() : undefined;

    const response = await fetch("https://app.loops.so/api/v1/events/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOOPS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: cleanEmail,
        eventName: SIGNUP_EVENT,
        ...(firstName ? { firstName } : {}),
        source: "Design Show & Tell",
        mailingLists: {
          [DESIGN_SHOW_AND_TELL_LIST_ID]: true,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      console.error("Loops events error:", data);
      return NextResponse.json(
        { error: "couldn't add you. try again in a moment." },
        { status: response.ok ? 400 : response.status }
      );
    }

    return NextResponse.json(
      { success: true, message: "you're on the list. a hello is on its way to your inbox." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: "couldn't add you. try again in a moment." },
      { status: 500 }
    );
  }
}
