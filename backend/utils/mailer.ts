import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

async function initMailer() {
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Ethereal Mailer Configuration initialized securely.");
  } catch (error) {
    console.error("Fatal initialization error tracking SMTP configurations:", error);
  }
}

// Initialize on load
initMailer();

export async function sendEmail(targetEmail: string, subjectLine: string, htmlDOM: string) {
  if (!transporter) {
     await initMailer();
  }
  
  try {
    if (transporter) {
      const mailInfo = await transporter.sendMail({
        from: '"Academic Scheduler Admin" <notifications@faculty-scheduler.edu>',
        to: targetEmail,
        subject: subjectLine,
        html: htmlDOM
      });
      
      console.log(`\n======================================================`);
      console.log(`📧 SECURE HTML DISPATCH SUBMITTED TO: ${targetEmail}`);
      console.log(`🔗 PREVIEW REAL EMAIL IN BROWSER: ${nodemailer.getTestMessageUrl(mailInfo)}`);
      console.log(`======================================================\n`);
      return mailInfo;
    }
  } catch(error) {
    console.error("Nodemailer Execution Error:", error);
  }
  return null;
}
