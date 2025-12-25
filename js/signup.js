console.log("JS Connected - Signup Via App Write!");

import { createAppwriteClient } from "./appwriteClient.js";
import { ID } from "https://cdn.jsdelivr.net/npm/appwrite@15.0.0/+esm";

const { auth , client } = await createAppwriteClient();
const user = await auth.get();

if(user){
    window.location.href = "/dashboard"
}

async function userSignup() {
    let userName = document.getElementById("userName").value.trim();
    let userEmail = document.getElementById("userEmail").value.trim();
    let userPassword = document.getElementById("userPassword").value.trim();
    let confirmPassword = document.getElementById("confirmPassword").value.trim();
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    console.log("Auth Client" , auth);
    console.log("Signup values:", { userName, userEmail, userPassword, confirmPassword });

    if(!userName || !userEmail || !userPassword || !confirmPassword) {
        Swal.fire({
            title: "Error!",
            text: "All fields are required.",
            icon: "error"
        });
        return;
    }

    if(!regex.test(userEmail)) {
        Swal.fire({
            title: "Error!",
            text: "Please enter a valid email address.",
            icon: "error"
        });
        return;
    }

    if(userPassword.length < 8) {
        Swal.fire({
            title: "Error!",
            text: "Password must be at least 8 characters long.",
            icon: "error"
        });
        return;
    }

    if(userPassword !== confirmPassword) {
        Swal.fire({
            title: "Error!",
            text: "Passwords do not match.",
            icon: "error"
        });
        return;
    }

    try {
        const user = await auth.create(
            ID.unique(),
            userEmail,
            userPassword,
            userName
        );
        Swal.fire({
            title: "Success!",
            text: "Account created successfully. Please log in.",
            icon: "success"
        }).then(() => {
            window.location.href = "/dashboard";
        });
    } catch (error) {
        Swal.fire({
            title: "Error!",
            text: "Database Error: " + error.message,
            icon: "error"
        });

        console.log(error);
    }
}

const signupBtn = document.querySelector(".signup-btn");
signupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const key = e.keyCode || e.which;
    if(key === 13) {
        userSignup();
        return;
    }
    userSignup();
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

const passwordInput = document.getElementById("userPassword");
const strengthFill = document.querySelector(".strength-fill");
const strengthText = document.querySelector(".strength-text strong");

passwordInput.addEventListener("input", () => {
    const val = passwordInput.value;
    let strength = 0;
    if(val.length >= 8) strength++;
    if(/[A-Z]/.test(val)) strength++;
    if(/[0-9]/.test(val)) strength++;
    if(/[\W]/.test(val)) strength++;

    switch(strength){
        case 0:
        case 1:
            strengthFill.style.width = "25%";
            strengthFill.style.background = "#e74c3c";
            strengthText.textContent = "Weak";
            break;
        case 2:
            strengthFill.style.width = "50%";
            strengthFill.style.background = "#f39c12";
            strengthText.textContent = "Medium";
            break;
        case 3:
            strengthFill.style.width = "75%";
            strengthFill.style.background = "#2ecc71";
            strengthText.textContent = "Strong";
            break;
        case 4:
            strengthFill.style.width = "100%";
            strengthFill.style.background = "#27ae60";
            strengthText.textContent = "Very Strong";
            break;
    }
});