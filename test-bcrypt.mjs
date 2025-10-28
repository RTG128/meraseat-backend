import bcrypt from "bcryptjs";

const password = "admin123";
const hash = await bcrypt.hash(password, 10);

console.log("Your new bcrypt hash: - test-bcrypt.mjs:6", hash);
