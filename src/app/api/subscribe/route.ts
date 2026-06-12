import { NextResponse } from "next/server";

// Loops mailing list to add subscribers to (the "design show&tell" list).
const DESIGN_SHOW_AND_TELL_LIST_ID = "cmqax5l0t76pp0jxi18hw5e0o";

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const LOOPS_API_KEY = process.env.LOOPS_API_KEY;

    if (!LOOPS_API_KEY) {
      console.error("LOOPS_API_KEY is not set");
      return NextResponse.json(
        { error: "Subscription service is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch("https://app.loops.so/api/v1/contacts/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOOPS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        firstName: typeof name === "string" ? name.trim() : undefined,
        source: "Design Show & Tell",
        mailingLists: {
          [DESIGN_SHOW_AND_TELL_LIST_ID]: true,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      console.error("Loops API error:", data);

      // Handle duplicate email case
      if (data.message && data.message.includes("already")) {
        return NextResponse.json(
          { error: "You're already on the list." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: data.message || "Failed to subscribe. Please try again." },
        { status: response.ok ? 400 : response.status }
      );
    }

    return NextResponse.json(
      { success: true, message: "You're on the list." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
