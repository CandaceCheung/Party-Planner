import pg from 'pg';
import dotenv from 'dotenv';
import jsonfile from "jsonfile";
import path from "path";
import crypto from "crypto";
import {hashPassword} from "../../util/hash";
import {Users,dataParts} from "../../util/models";

dotenv.config();

const client = new pg.Client({
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });

let usersNewObjList: Omit<Users,"id"|"created_at"|"updated_at">[] = [];
let counter = 0;

async function test() {
  const [usersDB] = (await client.query(`SELECT * FROM users;`)).rows;
  // If empty table
  if (!usersDB) {
    const test = 'test';
    const testPassword = await hashPassword(test);
    await client.query(
      `INSERT INTO users 
      (first_name,last_name,email,password,created_at,updated_at) 
      VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`,
      [test,test,test,testPassword]);
    
      const userObj: Omit<Users,"id"|"created_at"|"updated_at"> = {
        firstName: "test",
        lastName: "test",
        email: "test",
        phone: null,
        password: "test"
      }
      // Push new user object to json for writing in users.json later
      usersNewObjList.push(userObj);
  }
}

async function main() {
  await client.connect();
  
  // Insert test user when DB is empty
  await test();

  // Read random data parts for data assembling
  let names: dataParts = await jsonfile.readFile(path.join(__dirname,"/data/dataParts.json"));

  while (counter < 5) {
    // Names
    const firstName: string = names["firstName"][Math.floor(Math.random() * names["firstName"].length)];
    const lastName: string = names["lastName"][Math.floor(Math.random() * names["lastName"].length)];
    // Email
    const emailHost: string = names["emailHost"][Math.floor(Math.random() * names["emailHost"].length)];
    const email: string = `${firstName}${lastName}@${emailHost}`;
    // Phone
    const phoneAreaCode: string = names["phoneAreaCode"][Math.floor(Math.random() * names["phoneAreaCode"].length)];
    const phone: string = `${phoneAreaCode}-${Math.random().toString().concat("0".repeat(3)).substr(2,3)}-${Math.random().toString().concat("0".repeat(3)).substr(2,4)}`;
    // Password
    const password: string = crypto.randomBytes(20).toString('hex');
    const hashedPassword = await hashPassword(password);

    const [checkUsers] = (await client.query(`SELECT * FROM users WHERE email = $1 OR phone = $2;`,[email,phone])).rows;
    if (!checkUsers) {
      await client.query(
        `INSERT INTO users 
        (first_name,last_name,email,phone,password,created_at,updated_at) 
        VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`,
        [firstName, lastName, email, phone, hashedPassword]
      );
      const userObj: Omit<Users,"id"|"created_at"|"updated_at"> = {
        firstName,
        lastName,
        email,
        phone,
        password
      }
      // Push new user object to json for writing in users.json later
      usersNewObjList.push(userObj);
      counter++;
    }
  }
  
  // Writing into users.json
  let originalUsersList: Omit<Users,"id"|"created_at"|"updated_at">[] = await jsonfile.readFile(path.join(__dirname,"/data/users.json"));
  const finalUsersList: Omit<Users,"id"|"created_at"|"updated_at">[] = originalUsersList.concat(usersNewObjList);
  await jsonfile.writeFile(path.join(__dirname,"/data/users.json"), finalUsersList, {spaces:"\t"});

  client.end();
}

main();