console.log("JS Connected - login Via App Write!");

import { createAppwriteClient } from "./appwriteClient.js"

// const { auth } = await createAppwriteClient();

async function userLogin() {
    const { auth } = await createAppwriteClient();

    let userEmail = document.getElementById("userEmail").value.trim();
    let userPassword = document.getElementById("userPassword").value.trim();
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if(!userEmail || !userPassword){
        Swal.fire({
            title: "Error!",
            text: "All fields are required.",
            icon: "error"
        });
        return;
    };

    if(!regex.test(userEmail)) {
        Swal.fire({
            title: "Error!",
            text: "Please enter a valid email address.",
            icon: "error"
        });
        return;
    };

    try {
        const user = await auth.createEmailPasswordSession(
            userEmail,
            userPassword
        );

        Swal.fire({
            title: "Success!",
            text: "Login Successfully!",
            icon: "success"
        }).then(() => {
            window.location.href = "/dashboard"
        });
    } catch (error) {
        Swal.fire({
            title: "Error!",
            text: "Database Error: " + error.message,
            icon: "error"
        });
    };
};

const loginBtn = document.querySelector(".login-btn");
loginBtn.addEventListener('click' , (e) => {
    e.preventDefault();
    const key = e.keyCode || e.which 
    if(key === 13){
        userLogin();
        return;
    }
    userLogin();
});

document.querySelectorAll(".password-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
        const input = btn.previousElementSibling;
        if(input.type === "password") input.type = "text";
        else input.type = "password";
        btn.querySelector("i").classList.toggle("fa-eye");
        btn.querySelector("i").classList.toggle("fa-eye-slash");
    });
});