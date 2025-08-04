document
  .getElementById("attendance-form")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Stop the page from reloading

    const data = {
      totalClasses: document.getElementById("totalClasses").value,
      attendedClasses: document.getElementById("attendedClasses").value,
      minAttendance: document.getElementById("minAttendance").value,
    };

    const resultDiv = document.getElementById("result");
    resultDiv.textContent = "Calculating...";

    fetch("http://127.0.0.1:5000/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          resultDiv.textContent = "Error: " + data.error;
          resultDiv.style.color = "red";
        } else {
          resultDiv.textContent =
            "You can bunk " + data.bunksPossible + " more classes!";
          resultDiv.style.color = "green";
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        resultDiv.textContent = "Error: Could not connect to the server.";
        resultDiv.style.color = "red";
      });
  });
