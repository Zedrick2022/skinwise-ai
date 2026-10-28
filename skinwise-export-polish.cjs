const fs = require("fs");

const file = "public/index.html";
let html = fs.readFileSync(file, "utf8");

const replacements = [
  [
    'Review previous report records or regenerate a PDF from its saved analysis.',
    'Review report requests or regenerate a print-ready report from a saved analysis.'
  ],
  [
    'No reports recorded yet. Download a PDF report to start your history.',
    'No report requests recorded yet. Prepare a report to start your history.'
  ]
];

for (const [oldText, newText] of replacements) {
  const count = html.split(oldText).length - 1;

  if (count !== 1) {
    console.error("STOP: Expected one match, found " + count);
    console.error("Text: " + oldText);
    process.exit(1);
  }

  html = html.replace(oldText, newText);
}

fs.writeFileSync(file, html);
console.log("Report history wording updated successfully.");
