export function registerButtons() {
    document.querySelector('.register-form')
        .addEventListener('submit', async function(e) {
            e.preventDefault();

            const form = e.target;
            const emailRegex = /\S+@\S+\.\S+/;
            const passwrodRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/;

            const first_name = form.first_name.value;
            const last_name = form.last_name.value;
            const email = form.email.value;
            const phone = form.phone.value;
            const password = form.password.value;
            const confirm_password = form.confirm_password.value;

            let formObj = {
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': phone,
                'password': password
            }
            let dataPass = true;

            // Checking data validity
            if (!first_name || !last_name || !email || !password || !confirm_password) {
                dataPass = false;
                alert("Please fill in all necessary fields!");
            } else if (!emailRegex.test(email)) {
                dataPass = false;
                alert("Invalid email format!");
            } else if (!(password === confirm_password)) {
                dataPass = false;
                alert("Password and confirm password do not match!");
            } else if (password.length < 8 || password.length > 20) {
                dataPass = false;
                alert("Password length must be 8-20 characters!");
            } else if (!passwrodRegex.test(password)) {
                dataPass = false;
                alert("Invalid password format!");
            }

            if (dataPass) {
                const res = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formObj)
                });
                const registerResult = await res.json();
                if (registerResult.duplicate) {
                    form.reset();
                    alert("Registered already!");
                } else if (registerResult.passwordNotMatch) {
                    form.reset();
                    alert("Password not match!");
                } else if (!registerResult.status) {
                    form.reset();
                    alert("Unable to Register, please try again!");
                } else {
                    window.location.href = "./landing-page.html";
                }   
            }
        })   
}