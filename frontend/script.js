// === FILE: frontend/script.js (UPDATED FOR ATTENDANCE BUTTONS) ===

document.addEventListener("DOMContentLoaded", () => {
  const subjectsContainer = document.getElementById("subjects-container");
  const addSubjectBtn = document.getElementById("add-subject-btn");
  const modal = document.getElementById("add-subject-modal");
  const addSubjectForm = document.getElementById("add-subject-form");

  // --- Function to handle clicking the 'Attended' or 'Bunked' buttons ---
  const handleAttendanceUpdate = async (event) => {
    const button = event.target;
    const subjectId = button.dataset.subjectId;
    const status = button.dataset.status;

    // Briefly disable buttons to prevent double-clicking
    button.disabled = true;
    button.textContent = "Updating...";

    try {
      await fetch("http://127.0.0.1:5000/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, status }),
      });
      // If successful, refresh the whole dashboard to show new data
      fetchAndDisplaySubjects();
    } catch (error) {
      alert("Error updating attendance.");
      console.error("Update error:", error);
      // Re-enable the button if there was an error
      button.disabled = false;
    }
  };

  // --- 1. Function to Fetch and Display Subjects ---
  // In frontend/script.js, replace the entire fetchAndDisplaySubjects function

  // In frontend/script.js, replace the entire fetchAndDisplaySubjects function

  const fetchAndDisplaySubjects = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/subjects");
      const subjects = await response.json();

      const subjectsContainer = document.getElementById("subjects-container");
      subjectsContainer.innerHTML = "";

      if (subjects.length === 0) {
        subjectsContainer.innerHTML =
          "<p>No subjects found. Add a new subject to get started!</p>";
      } else {
        subjects.forEach((subject) => {
          const card = document.createElement("article");
          card.className = "subject-card";

          // --- (NEW) Logic to determine progress bar color using standard hex codes ---
          let progressBarColor = "#28a745"; // Green for safe
          if (subject.currentAttendance < subject.minAttendance) {
            progressBarColor = "#dc3545"; // Red for danger
          } else if (subject.currentAttendance < subject.minAttendance + 5) {
            progressBarColor = "#ffc107"; // Yellow for warning
          }

          card.innerHTML = `
                    <h3>${subject.subjectName}</h3>
                    <div class="attendance-stats">
                        <span>${subject.attendedClasses} / ${subject.totalClasses} attended</span>
                        <strong>${subject.currentAttendance}%</strong>
                    </div>
                    <div class="attendance-bar">
                        <div class="attendance-progress" style="width: ${subject.currentAttendance}%; background-color: ${progressBarColor};"></div>
                    </div>
                    <hr>
                    <p>
                        <strong>Bunks Available: ${subject.bunksPossible}</strong>
                        <br>
                        <small><em>${subject.recommendation}</em></small>
                    </p>
                    <div class="card-actions">
                        <button class="attended-btn attendance-btn" data-subject-id="${subject._id}" data-status="attended">✔️ Attended</button>
                        <button class="bunked-btn attendance-btn" data-subject-id="${subject._id}" data-status="bunked">❌ Bunked</button>
                    </div>
                `;
          subjectsContainer.appendChild(card);
        });

        // Re-add event listeners after cards are created
        document.querySelectorAll(".attendance-btn").forEach((button) => {
          button.addEventListener("click", handleAttendanceUpdate);
        });
      }
    } catch (error) {
      subjectsContainer.innerHTML =
        '<p style="color: red;">Error fetching subjects. Is the server running?</p>';
    }
  };

  // --- 2. Logic for "Add Subject" Modal (remains the same) ---
  addSubjectBtn.addEventListener("click", () => modal.showModal());
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.classList.contains("close")) {
      modal.close();
    }
  });

  // --- 3. Logic for Submitting the New Subject Form (remains the same) ---
  addSubjectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(addSubjectForm);
    const subjectData = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("http://127.0.0.1:5000/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectData),
      });
      if (response.ok) {
        addSubjectForm.reset();
        modal.close();
        fetchAndDisplaySubjects();
      } else {
        alert("Failed to add subject.");
      }
    } catch (error) {
      alert("Error connecting to the server.");
    }
  });

  // --- Initial Load ---
  fetchAndDisplaySubjects();
});
