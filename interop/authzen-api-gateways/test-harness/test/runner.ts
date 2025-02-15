import clc from "cli-color";
import { evaluation } from "./decisions.json";

const AUTHZEN_PDP_URL =
  process.argv[2] || "https://authzen-gateway-proxy.demo.aserto.com";
const AUTHZEN_PDP_API_KEY = process.env.AUTHZEN_PDP_API_KEY;

enum OutputTypes {
  HTML,
  CONSOLE,
}

const FORMAT =
  process.argv[3] === "html" ? OutputTypes.HTML : OutputTypes.CONSOLE;

type Endpoint = "evaluation" | "evaluations";

interface Result {
  endpoint: Endpoint;
  request: (typeof evaluation)[number]["request"];
  expected: (typeof evaluation)[0]["expected"];
  response?: boolean;
  status: "PASS" | "FAIL" | "ERROR";
  error?: string;
}

async function main() {
  if (process.argv.length < 3) {
    console.log(`Usage: yarn test <authorizer-url> [<format>]

    <format> should be one of:
      console
      html

      and defaults to html
  `);
    process.exit(0);
  }

  const decisionFile ='./decisions.json'
  const { evaluation, evaluations } = require(decisionFile);

  const results: Result[] = [];

  const startTime = new Date().getTime();

  for (const decision of evaluation || []) {
    const result = await execute(decision, "evaluation");
    results.push(result);
  }

  for (const decision of evaluations || []) {
    const result = await execute(decision, "evaluations");
    results.push(result);
  }

  const endTime = new Date().getTime();

  if (FORMAT === OutputTypes.HTML) {
    console.log(
      wrapHTML(
      arrayToTable(startTime, endTime,
        results.map((d) => {
          return {
            result: d.status,
            request: JSON.stringify(d.request, null, 2),
            response: JSON.stringify(d.response, null, 2)
          };
        })
      ))
    );
  }
}

async function execute(
  decision: (typeof evaluation)[number],
  endpoint: Endpoint
): Promise<Result> {
  const REQ = decision.request;
  const EXP = decision.expected;
  try {
    const response = await fetch(`${AUTHZEN_PDP_URL}/access/v1/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: AUTHZEN_PDP_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(REQ),
    });

    const data = await response.json();
    const RSP =
      endpoint === "evaluation"
        ? data.decision || false
        : data.evaluations || [];

    const result: Result = {
      endpoint,
      request: REQ,
      response: RSP,
      expected: EXP,
      status: JSON.stringify(EXP) === JSON.stringify(RSP) ? "PASS" : "FAIL",
    };

    if (FORMAT === OutputTypes.CONSOLE) logResult(result);
    return result;
  } catch (error) {
    const result: Result = {
      endpoint,
      request: REQ,
      expected: EXP,
      status: "ERROR",
      error: error.message,
    };
    if (FORMAT === OutputTypes.CONSOLE) logResult(result);
    return result;
  }
}

function logResult(result: Result) {
  switch (result.status) {
    case "PASS":
      console.log(clc.green("PASS"), "REQ:", JSON.stringify(result.request));
      break;

    case "FAIL":
      console.log(clc.red("FAIL"), "REQ:", JSON.stringify(result.request));
      break;

    default:
      console.log(
        clc.yellow("ERROR"),
        "REQ:",
        JSON.stringify(result.request),
        "Error:",
        result.error
      );
      break;
  }
}

function arrayToTable(startTime, endTime, array) {
  var table = `<table class="results">
  <tr>
    <th>Result</th>
    <th>Request</th>
    <th>Actual Response</th>
  </tr>
`;
  // Generate table body
  var counter = 0;
  var success = 0;
  array.forEach(function (item) {
    var odd = counter++ % 2 === 0 ? "odd" : "even";
    if (item.result) success++;
    const testResult = item.result ? "success" : "fail";
    table += `  <tr class="${odd}">
    <td class="${testResult}">${String(item.result)}</td>
    <td>

`;
    table += "<pre>" + item.request + "</pre>";
    table += `  </td><td><pre>${item.response}</pre></td>
  </tr>
`;
  });

  table += "</table>";
  var rate = (success / array.length) * 100;
  table += `<p>Success rate: ${success}/${array.length} (${rate}%).</p>`;
  table += `<p>Test run on ${new Date().toISOString()}</p>`;
  table+= `<p>Test duration: ${((endTime - startTime)/1000).toFixed(2)} s.</p>`;

  // Return table
  return table;
}

function wrapHTML(body) {
  return `<!DOCTYPE html>` + 
         `<html lang="en">` + 
         `<head><meta charset="UTF-8"><style>*{font-family: Helvetica, Arial, sans-serif;}th{background-color: #555555; color: #eeeeee;} .success{background: green; color: white;} .fail{background: red; color: white;} .odd{background-color: #eeeeee;} td, th{padding: 5px;} tr{border: solid 1px black;} pre{font-family: monospace; font-size: small;}table{border-collapse: collapse;}</style><title>AuthZEN Test Results</title></head><body><h1>Test Results</h1>` + 
         body + 
         `</body></html>`;

}

main();
