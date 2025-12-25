console.log("Landing Page!");

import { createAppwriteClient } from "./appwriteClient.js"

const redictLogin = () => {
    window.location.href = "/login";
};

const redictSignup = () => {
    window.location.href = "/signup";
};

const loginBtn = document.querySelector(".btn-login");
loginBtn.addEventListener('click' , redictLogin);

const signupBtn = document.querySelector(".btn-signup");
signupBtn.addEventListener('click' , redictSignup);

const { auth } = await createAppwriteClient();
const user = await auth.get();

if(user){
    window.location.href = "/dashboard"
}