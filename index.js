const express = require("express");
const app = express();
const ejs = require("ejs");
const { createClient } = require("@supabase/supabase-js");
const logger = console;
const serverless = require("serverless-http");

const port = parseInt(process.env.PORT || "3001", 10)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

app.get("/", async function (req, res) {
  if (process.env.NODE_ENV !== "production") {
    ejs.clearCache();
  }

  const userAgent = req.headers["user-agent"];

  // Add if no user agent in db
  const { data, error } = await supabase.from("useragents").upsert(
    [
      {
        userAgent,
      },
    ],
    { upsert: true, onConflict: "userAgent" }
  );

  if (error) {
    logger.warn("Failed to upsert", error);
  }

  logger.info("Upsert data", data);

  const userCount = data[0].userCount + 1;

  // Increment userCount
  const { data: dataIncrement, error: error2 } = await supabase
    .from("useragents")
    .update({ userCount })
    .eq("userAgent", userAgent);

  logger.info("Increment data", dataIncrement);

  const html = await ejs.renderFile("./template.html", {
    query: req.query,
    userAgent,
    userCount,
  });
  res.status(200).contentType("text/html").send(html);
});

// Do not run server on AWS Lambda
if (process.env.AWS_EXECUTION_ENV !== undefined) {
  console.log("AWS Lambda started, handler:", process.env._HANDLER);
} else {
  // Do something when serverless offline started
  if (process.env.IS_OFFLINE === "true") {
    console.log("Serverless offline started.");
  } else {
    app.listen(port, () => {
      console.log(`Listening on port: ${port}`);
    });
  }
}

module.exports.serverless = serverless(app);
