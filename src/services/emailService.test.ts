import nodemailer from "nodemailer";
import { expect, test, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    EMAIL_FROM: "sender@example.test",
    EMAIL_HOST: "smtp.example.test",
    EMAIL_PORT: 587,
    EMAIL_SECURE: false,
    EMAIL_USER: "test-user",
    EMAIL_PASS: "test-password",
    APP_BASE_URL: "https://unclassed.example.test/",
  },
}));

test("composes match notifications and status updates with Nodemailer", async () => {
  const transporter = nodemailer.createTransport({ jsonTransport: true });
  const createTransport = vi
    .spyOn(nodemailer, "createTransport")
    .mockReturnValue(transporter);
  const sendMail = vi.spyOn(transporter, "sendMail");

  try {
    const { emailService } = await import("./emailService");

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      auth: { user: "test-user", pass: "test-password" },
    });
    expect(
      await emailService.sendMatchNotification("student@example.test", {
        userName: "Student",
        matchType: "Single",
        subjects: ["Algorithms"],
        fromClass: "1DA",
        toClass: "1DB",
        otherParticipants: ["Other student"],
        matchId: "match-1",
        dashboardUrl: "https://unclassed.example.test/",
      })
    ).toBe(true);
    expect(
      await emailService.sendMatchStatusUpdate(
        "student@example.test",
        "Student",
        "match-1",
        "ACCEPTED",
        "Match accepted"
      )
    ).toBe(true);

    for (const result of sendMail.mock.results) {
      const message = JSON.parse((await result.value).message);
      expect(message.from.address).toBe("sender@example.test");
      expect(message.to[0].address).toBe("student@example.test");
      expect(message.html).toContain("Student");
    }
    const statusMessage = JSON.parse(
      (await sendMail.mock.results[1].value).message
    );
    expect(statusMessage.html).toContain(
      "https://unclassed.example.test/matches"
    );
  } finally {
    vi.restoreAllMocks();
  }
});
