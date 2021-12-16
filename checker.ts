import request from "request";
import { parse } from "node-html-parser";
import nodemailer from "nodemailer";
import schedule from "node-schedule";
import DbUtil from "./db.js";
import dotenv from "dotenv";
import twilio from "twilio";
dotenv.config();

export default class Checker {
  config;
  constructor() {
    this.config = {
      lastCheck: new Date(),
      lastStatus: "NULL",
    };
    this.fetchStatus();

    //check every 5 minutes
    schedule.scheduleJob("*/5 * * * *", () => {
      this.fetchStatus();
    });
  }

  fetchStatus() {
    console.log("fetching status HTML page");

    request(process.env.TRAIL_STATUS_URL, {}, async (err, res, body) => {
      console.log("fetch complete, parsing...");
      const root = parse(body);
      const tableElem = root.querySelector("table td").parentNode;
      let trailStatus =
        tableElem.rawText.toLowerCase().indexOf("open") === -1
          ? "Closed"
          : "Open";

      console.log("processing complete, trail status: " + trailStatus);

      if (trailStatus != "") {
        if (
          trailStatus != this.config.lastStatus &&
          this.config.lastStatus != "NULL"
        ) {
          await this.sendNotifications(trailStatus);
        }

        this.config.lastStatus = trailStatus;
        this.config.lastCheck = new Date();
      }
    });
  }

  async sendNotifications(trailStatus) {
    const dbUtil = new DbUtil();
    const users = await dbUtil.fetchUsers();

    console.log("sending notifications");

    const subject = "Bidwell Trail Status Update";
    const text = "Trail status changed to: " + trailStatus;

    try {
      const smsClient = twilio(process.env.SMS_SID, process.env.SMS_TOKEN);
      const transporter = this.getTransporter();

      for (const user of users) {
        console.log("sending notification to:" + user.email);
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL,
          to: user.email,
          subject,
          text,
        });
        console.log("Message sent: %s", info.messageId);

        if (user.phone) {
          console.log(`${user.email} has phone ${user.phone}, sending sms`);
          smsClient.messages
            .create({
              body: `${subject}. ${text}`,
              from: `+1${process.env.SMS_FROM}`,
              to: `+1${user.phone}`,
            })
            .then((message) => console.log(message.sid));
          try {
          } catch (e) {
            console.log(e);
          }
        }
      }
    } catch (e) {
      console.log("error sending emails", e);
    }
  }

  currentStatus() {
    return {
      trailStatus: this.config.lastStatus,
      lastCheck: this.config.lastCheck,
    };
  }

  getTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PWD,
      },
    });
  }

  sendNewUserNotification(email, phone, existingUser) {
    this.getTransporter().sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: process.env.SMTP_ADMIN_EMAIL,
      subject: existingUser ? "User updated" : "New user registered",
      text: `user details: email=${email}, phone=${phone}`,
    });
  }

  sendUserUnsubNotification(email) {
    this.getTransporter().sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: process.env.SMTP_ADMIN_EMAIL,
      subject: "User unsubscribed",
      text: "user: " + email,
    });
  }

  sendRegEmail(email) {
    this.getTransporter().sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: email,
      subject: "Trail Checker Registration",
      text:
        "Thank you for registering!  The current trail status is " +
        this.config.lastStatus +
        ". We'll send you an update when that changes!",
    });
  }
}
