import express, { Request, Response } from "express";
import { logger } from "../util/logger";
import { client } from "../app";
import { checkPassword } from "../util/functions/hash";

export const loginRoutes = express.Router();

loginRoutes.get("/", checkSessionLogin);
loginRoutes.post("/", login);
loginRoutes.get("/name", getName);
loginRoutes.post("/logout", logout);
// loginRoutes.get("/google", loginGoogle);

async function checkSessionLogin(req: Request, res: Response) {
  try {
    logger.debug("Before reading DB");
    if (req.session.user) {
      const loginUser = (
        await client.query(`SELECT * FROM users WHERE id = $1`, [
          req.session.user
        ])
      ).rows[0];
      if (loginUser) {
        res.json({ status: true });
      } else {
        res.status(401).json({ status: false });
      }
    } else {
      res.status(401).json({ status: false });
    }
  } catch (e) {
    logger.error(e);
    res.status(500).json({ msg: "[LOG001]: Failed to check Login" });
  }
}

async function login(req: Request, res: Response) {
  try {
    logger.debug("Before reading DB");
    const loginUser = (
      await client.query(`SELECT * FROM users WHERE email = $1`, [
        req.body.email,
        
      ])
    ).rows[0];

    if (loginUser) {
      const match = await checkPassword(req.body.password, loginUser.password);
      if (match) {
        req.session.user = loginUser.id;
        res.json({
          status: true,
          user: loginUser.email,
        });
      } else {
        res.status(401).json({ status: false });
      }
    } else {
      res.status(401).json({ status: false });
    }
  } catch (e) {
    logger.error(e);
    res.status(500).json({ msg: "[LOG002]: Failed to check Login" });
  }
}

async function getName(req: Request, res: Response) {
  try {
    logger.debug("Before reading DB");
    const userName = (
      await client.query(`SELECT * FROM users WHERE id = $1`, [
        req.session.user
      ])
    ).rows[0];

    if (userName) {
      res.json({
        status: true,
        user: userName.first_name,
      });
    } else {
      res.status(401).json({ status: false });
    }
  } catch (e) {
    logger.error(e);
    res.status(500).json({ msg: "[LOG003]: Failed to get Name" });
  }
}

async function logout(req: Request, res: Response) {
  try {
    logger.debug("Before logging out");
    req.session.user = undefined;
    res.json({ status: true });
  } catch(e) {
    logger.error(e);
    res.status(500).json({ msg: "[LOG004]: Failed to Logout" })
  }
}


// async function loginGoogle (req:express.Request,res:express.Response){
//   const accessToken = req.session?.['grant'].response.access_token;
//   const fetchRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{
//       method:"get",
//       headers:{
//           "Authorization":`Bearer ${accessToken}`
//       }
//   });
//   const result = await fetchRes.json();
//   const users = (await client.query(`SELECT * FROM users WHERE users.username = $1`,[result.email])).rows;
//   let user = users[0];
//   if(!user){
//       // Create the user when the user does not exist
//       user = (await client.query(`INSERT INTO users (first_name, last_name, password) 
//               VALUES ($1,$2) RETURNING *`,
//           [first_name, last_name ,password])).rows[0]
//   }
//   if(req.session){
//       req.session['user'] = {
//           id: user.id
//       };    
//   }
//   return res.redirect('/')
// }