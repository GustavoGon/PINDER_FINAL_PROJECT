const form = document.getElementById("loginForm");
const errorText = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;

  const password = document.getElementById("password").value;

  try {
    const response = await fetch(
      "https://pinder-final-project.onrender.com/admin/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      errorText.textContent = data.error || "Login failed";

      return;
    }

    localStorage.setItem("adminToken", data.token);

    window.location.href = "index.html";
  } catch (error) {
    errorText.textContent = "Could not connect to server";
  }
});
