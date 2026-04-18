import nodemailer from "nodemailer";

export const SendEmail = async ({ to, subject, html }) => {
    try {
        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.USER,
                pass: process.env.PASS, // لازم يكون App Password مش الباسورد العادي
            }
        });

        const info = await transport.sendMail({
            from: `امتجر ابو الدهب للمنتجات الغذائية`,
            to,
            subject,
            html
        });

        console.log("Email sent:", info.messageId);

    } catch (err) {
        console.log("EmailError:", err);
        throw err;
    }
};
