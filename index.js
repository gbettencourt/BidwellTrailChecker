import express from "express";
import winston from "winston";
import expressWinston from "express-winston";
import { body, check, validationResult } from "express-validator";
import { join, dirname } from "path";
import Checker from "./checker.js";
import DbUtil from "./db.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

app.use(
  expressWinston.logger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({
        format: "MM-DD-YYYY HH:mm:ss",
      }),
      winston.format.printf((info) => {
        return `${info.timestamp}: ${info.message}`;
      })
    ),
  })
);

// Serve the static files from the React app
app.use(express.static(join(__dirname, "/client/build")));

app.get("/api/users", async (req, res) => {
  let list = [];
  if (req.connection.localAddress === req.connection.remoteAddress) {
    list = await dbUtil.fetchEmails();
  }
  res.json(list);
});

app.get("/api/trailstatus", (req, res) => {
  res.json(checker.currentStatus());
});

app.post(
  "/api/registeremail",
  [
    check("email").isEmail(),
    check("phone")
      .if(body("phone").exists({ checkFalsy: true }))
      .isMobilePhone(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.send({
        success: false,
        error: "invalid email/phone",
      });
      return;
    }
    const email = req.body.email;
    const phone = req.body.phone;
    console.log("register new email=" + email);
    console.log("register new phone=" + phone);

    const users = await dbUtil.fetchUsers();
    const existingUser = users.find((user) => user.email === email);

    if (existingUser) {
      console.log(`updating existing user, email=${email}, phone=${phone}`);
      existingUser.phone = phone;
      await dbUtil.save();
    } else {
      await dbUtil.addUser(email, phone);
    }

    //send confirmation emails
    try {
      checker.sendNewUserNotification(email, phone, existingUser);
      checker.sendRegEmail(email);
    } catch (e) {
      console.log("error sending new user email", e);
    }

    res.send({
      success: true,
    });
  }
);

app.post("/api/rmemail", [check("email").isEmail()], async (req, res) => {
  console.log(req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.send({
      success: false,
      error: "invalid email",
    });
    return;
  }
  const email = req.body.email;
  console.log("removing email=" + email);
  try {
    checker.sendUserUnsubNotification(email);
  } catch (e) {
    console.log("error sending email", e);
  }

  await dbUtil.removeUser(email);
  res.send({
    success: true,
  });
});

// Handles any requests that don't match the ones above
app.get("*", (req, res) => {
  res.sendFile(join(__dirname + "/client/build/index.html"));
});

//init trail checker
const checker = new Checker();
//init db client
const dbUtil = new DbUtil();

//start server
const port = process.env.PORT || 5000;
app.listen(port);

console.log("App is listening on port " + port);
