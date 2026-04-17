import fs from "fs";

fs.writeFileSync("test.txt", "hello");
const form = new FormData();
form.append("file", new Blob(["hello"]), "test.txt");

fetch("http://localhost:3000/api/upload", {
  method: "POST",
  body: form
}).then(async res => {
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}).catch(console.error);
