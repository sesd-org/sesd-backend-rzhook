import { createRequire } from "module";
const require = createRequire(import.meta.url);

const moment = require("moment-timezone");

const express = require("express");
const dotenv = require("dotenv");
var cors = require("cors");
const PORT = process.env.PORT || 3000;

import { createClient } from "@supabase/supabase-js";
import { log } from "console";
const supabase = createClient(
  "https://bjxlpxvlgsooqyqmqodd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqeGxweHZsZ3Nvb3F5cW1xb2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDIyMTIxOTAsImV4cCI6MjAxNzc4ODE5MH0.VteIMWduAPGM6BS-u0xP_-0eGFL5x5HqssZtCrDbD7c"
);

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
  });
});

app.post("/rzhook", async (req, res) => {
  const memberInfo = req.body["payload"]["payment"]["entity"]["notes"];
  const date = new Date();
  const endDate =
    memberInfo["membership"] === "LifeTime"
      ? date.setDate(date.getDate() + 10000)
      : date.setDate(date.getDate() + 365);
  try {
    const { data: memberData, err } = await supabase
      .from("members")
      .select("*")
      .eq("email", memberInfo["email"])
      .single();
    console.log("Fetched Memberdata");
    console.log(memberData);
    if (memberInfo["membership"] != null) {
      console.log("Its Membership Request");
      //TODO: Check member is Already Available then upgrade It
      if (memberData != null) {
        await supabase
          .from("members")
          .update({
            sub: memberInfo["membership"],
            subend: new Date(endDate).toISOString(),
          })
          .eq("email", memberInfo["email"]);
      } else {
        //TODO: Check member is Not Available then Create It
        console.log("Adding membership to database");
        await supabase.from("members").insert({
          name: memberInfo["email"],
          sub: memberInfo["membership"],
          email: memberInfo["email"],
          phone: memberInfo["phone"],
          addr: memberInfo["city"],
          subend: new Date(endDate).toISOString(),
        });
      }
    } else if (memberInfo["event"] != null) {
      const date = moment.tz(memberInfo["date"], "DD-MM-YYYY", "Asia/Kolkata");
      const eventDate = date.format();
      console.log("Its Event Request");
      //TODO: Check member is Already Available then Ad Event with Member ID
      if (memberData != null) {
        await supabase.from("atend").insert({
          memberid: memberData["id"],
          event: memberInfo["event"],
          date: eventDate,
        });
      } else {
        //TODO: Check member is Not Available then First Create Free Member Then Add Event
        const { data: newData, err } = await supabase
          .from("members")
          .insert({
            name: memberInfo["name"],
            sub: "Free",
            email: memberInfo["email"],
            phone: memberInfo["phone"],
            addr: memberInfo["city"],
            subend: new Date(endDate).toISOString(),
          })
          .select("*")
          .single();
        if (err != null) {
          console.log(err);
        } else {
          console.log("New Created User:");
          console.log(newData);
        }
        await supabase.from("atend").insert({
          memberid: newData["id"],
          event: memberInfo["event"],
          date: eventDate,
        });
      }
    }
    console.log("Memberdata From Request");
    console.log(memberInfo);
    res.status(200).json({ success: true }).end();
  } catch (e) {
    console.log(e);
    res.status(200).json({ success: false }).end();
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}!`);
});
