const nodemailer = require('nodemailer');

let testAccount = null;
let transporter = null;

// Explicitly generate a unified Ethereal testing account mapping across the Node execution limits.
async function initMailer() {
  try {
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Ethereal Mailer Configuration initialized securely over active Node pipelines.");
  } catch (error) {
    console.error("Fatal initialization error tracking SMTP configurations:", error);
  }
}

// Execute on server boot natively matching universal mappings.
initMailer();

/**
 * Construct powerful HTML templates natively firing payload buffers securely dynamically out into browser interfaces.
 */
async function sendEmail(targetEmail, subjectLine, htmlDOM) {
  if (!transporter) {
     await initMailer();
  }
  
  try {
    const mailInfo = await transporter.sendMail({
      from: '"Academic Scheduler Admin" <notifications@faculty-scheduler.edu>',
      to: targetEmail,
      subject: subjectLine,
      html: htmlDOM
    });
    
    // Explicitly expose explicit preview URLs executing securely against Node runtime stdout 
    console.log(`\n======================================================`);
    console.log(`📧 SECURE HTML DISPATCH SUBMITTED TO: ${targetEmail}`);
    console.log(`🔗 PREVIEW REAL EMAIL IN BROWSER: ${nodemailer.getTestMessageUrl(mailInfo)}`);
    console.log(`======================================================\n`);
    return mailInfo;
  } catch(error) {
    console.error("Nodemailer Execution Error:", error);
  }
}

module.exports = { sendEmail };
