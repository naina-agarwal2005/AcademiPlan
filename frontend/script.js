document.addEventListener("DOMContentLoaded", () => {
  const isLive =
    !window.location.hostname.includes("127.0.0.1") &&
    window.location.protocol !== "file:";
  const API_BASE_URL = isLive
    ? "https://academiplan-naina.onrender.com"
    : "http://127.0.0.1:5000";

  //GET ALL ELEMENT REFERENCES
  const allPages = document.querySelectorAll(".page");
  const authNav = document.getElementById("auth-nav");
  const mainNav = document.getElementById("main-nav");
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const subjectsContainer = document.getElementById("subjects-container");
  const addSubjectBtn = document.getElementById("add-subject-btn");
  const subjectModal = document.getElementById("add-subject-modal");
  const addSubjectForm = document.getElementById("add-subject-form");
  const mainDashboardNavLinks = document.querySelectorAll(
    "#main-nav .nav-link"
  );
  const historyPageContainer = document.getElementById(
    "history-list-container"
  );
  const plannerPageContainer = document.getElementById("calendar");
  const welcomePage = document.getElementById("welcome-page");
  const welcomeUsername = document.getElementById("welcome-username");
  const welcomeNavButtons = document.querySelectorAll(".welcome-nav-btn");
  const eventModal = document.getElementById("add-event-modal");
  const eventForm = document.getElementById("add-event-form");
  const eventStartDateInput = document.getElementById("eventStartDate");
  const brandLink = document.querySelector(".brand");
  let calendar;

  // HELPER FUNCTIONS
  const getToken = () => localStorage.getItem("token");
  const getUsername = () => localStorage.getItem("username");
  const showMessage = (page, msg, isError = false) => {
    const messageContainer = document.getElementById(`${page}-message`);
    if (messageContainer) {
      messageContainer.textContent = msg;
      messageContainer.style.color = isError
        ? "var(--pico-color-red-500)"
        : "var(--pico-color-green-500)";
    }
  };

  // VIEW MANAGEMENT
  const showPage = (pageId) => {
    allPages.forEach((p) => {
      p.style.display = "none";
    });
    const pageToShow = document.getElementById(pageId);
    if (pageToShow) pageToShow.style.display = "block";
  };

  const updateView = () => {
    const token = getToken();
    const username = getUsername();
    if (token && username) {
      authNav.style.display = "none";
      mainNav.style.display = "none";
      welcomeUsername.textContent = `Welcome, ${username}!`;
      showPage("welcome-page");
    } else {
      authNav.style.display = "flex";
      mainNav.style.display = "none";
      showPage("login-page");
    }
  };

  // API & CORE FUNCTIONS
  const fetchAndDisplaySubjects = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subjects = await response.json();
      if (subjects.message) {
        handleLogout();
        return;
      }
      subjectsContainer.innerHTML = "";
      if (subjects.length === 0) {
        subjectsContainer.innerHTML = `
        <article class="empty-state">
            <h3>Welcome to Your AcademiPlan Dashboard!</h3>
            <p>This is where you'll see a real-time overview of your attendance for all your subjects.</p>
            <footer>
                <p><strong>How it works:</strong></p>
                <ul>
                    <li><strong>Track Everything:</strong> Click the "Add New Subject" button to start tracking your classes.</li>
                    <li><strong>Get Smart Advice:</strong> Each subject card will calculate your attendance and give you smart recommendations.</li>
                    <li><strong>View Your Progress:</strong> Every time you mark attendance, a permanent record is saved to your personal <strong>History</strong> page.</li>
                </ul>
            </footer>
        </article>
    `;
      } else {
        subjects.forEach((subject) => {
          const card = document.createElement("article");
          card.className = "subject-card";
          let pBarColor = "#28a745";
          if (subject.currentAttendance < subject.minAttendance)
            pBarColor = "#dc3545";
          else if (subject.currentAttendance < subject.minAttendance + 5)
            pBarColor = "#ffc107";
          card.innerHTML = `
          <button class="delete-subject-btn secondary outline" data-subject-id="${subject._id}">X</button>
    <h3>${subject.subjectName}</h3>
    <div class="attendance-stats">
        <span>${subject.attendedClasses} / ${subject.totalClasses} classes attended</span>
        <strong>${subject.currentAttendance}%</strong>
    </div>
    <div class="attendance-bar">
        <div class="attendance-progress" style="width: ${subject.currentAttendance}%; background-color: ${pBarColor};"></div>
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
        document
          .querySelectorAll(".attendance-btn")
          .forEach((button) =>
            button.addEventListener("click", handleAttendanceUpdate)
          );
        document
          .querySelectorAll(".delete-subject-btn")
          .forEach((button) =>
            button.addEventListener("click", handleSubjectDelete)
          );
      }
    } catch (error) {
      subjectsContainer.innerHTML = `<p style="color: red;">Error fetching subjects: ${error.message}</p>`;
    }
  };

  const handleSubjectDelete = async (event) => {
    const button = event.target.closest("button");
    const subjectId = button.dataset.subjectId;
    if (
      !window.confirm(
        "Are you sure you want to delete this subject and all its history? This action cannot be undone."
      )
    ) {
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/subjects/${subjectId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        fetchAndDisplaySubjects();
      } else {
        alert("Failed to delete the subject.");
      }
    } catch (error) {
      alert("Error connecting to the server.");
    }
  };

  const handleAddSubject = async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    const formData = new FormData(addSubjectForm);
    const subjectData = Object.fromEntries(formData.entries());
    try {
      const response = await fetch(`${API_BASE_URL}/api/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subjectData),
      });
      if (response.ok) {
        addSubjectForm.reset();
        subjectModal.close();
        fetchAndDisplaySubjects();
      } else {
        alert("Failed to add subject.");
      }
    } catch (error) {
      alert("Error connecting to the server.");
    }
  };

  const handleAttendanceUpdate = async (event) => {
    const token = getToken();
    if (!token) return;
    const button = event.target.closest("button");
    const subjectId = button.dataset.subjectId;
    const status = button.dataset.status;
    button.disabled = true;
    button.textContent = "Updating...";
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectId, status }),
      });
      if (!response.ok) throw new Error("Update failed");
      fetchAndDisplaySubjects();
    } catch (error) {
      alert("Error updating attendance.");
    }
  };

  const fetchHistory = async () => {
    const token = getToken();
    if (!token) return;
    historyPageContainer.innerHTML =
      "<article><p>Loading history...</p></article>";
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const historyLog = await response.json();
      if (historyLog.message) {
        handleLogout();
        return;
      }
      if (historyLog.length === 0) {
        historyPageContainer.innerHTML =
          "<article><p>No history yet.</p></article>";
        return;
      }
      let historyHTML = "<article>";
      historyLog.forEach((record) => {
        const statusText =
          record.status === "attended" ? "✅ Attended" : "❌ Bunked";
        const date = new Date(record.timestamp.replace(" ", "T") + "Z");
        historyHTML += `<div class="history-item"><div><p style="margin:0;"><strong>${
          record.subjectName || "Unknown"
        }</strong>: Marked as ${statusText}</p><small>${date.toLocaleString()}</small></div><button class="secondary outline delete-history-btn" data-record-id="${
          record._id
        }">Delete</button></div>`;
      });
      historyHTML += "</article>";
      historyPageContainer.innerHTML = historyHTML;
      document
        .querySelectorAll(".delete-history-btn")
        .forEach((button) =>
          button.addEventListener("click", handleHistoryDelete)
        );
    } catch (error) {
      historyPageContainer.innerHTML = `<p style="color: red;">Could not fetch history.</p>`;
    }
  };
  const handleHistoryDelete = async (event) => {
    const button = event.target.closest("button");
    const recordId = button.dataset.recordId;
    if (
      !window.confirm("Are you sure? This will update your attendance counts.")
    )
      return;
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/${recordId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchHistory();
      } else {
        alert("Failed to delete the record.");
      }
    } catch (error) {
      alert("Error connecting to the server.");
    }
  };
  const initializeCalendar = () => {
    if (!plannerPageContainer) return;
    plannerPageContainer.innerHTML = "";
    const token = getToken();
    calendar = new FullCalendar.Calendar(plannerPageContainer, {
      initialView: "timeGridWeek",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
      height: "auto",
      selectable: true,
      editable: true,
      dateClick: (info) => {
        eventForm.reset();
        const clickedDate = info.date;
        const year = clickedDate.getFullYear();
        const month = String(clickedDate.getMonth() + 1).padStart(2, "0");
        const day = String(clickedDate.getDate()).padStart(2, "0");
        const dateString = `${year}-${month}-${day}`;
        const timeString =
          String(clickedDate.getHours()).padStart(2, "0") +
          ":" +
          String(clickedDate.getMinutes()).padStart(2, "0");

        eventStartDateInput.value = dateString;
        document.getElementById("eventStartTime").value = timeString;
        document.getElementById("eventEndTime").value = timeString;
        eventModal.showModal();
      },
      eventClick: (info) => {
        if (window.confirm(`Delete event: '${info.event.title}'?`)) {
          handleEventDelete(info);
        }
      },
      events: (info, successCallback, failureCallback) => {
        fetch(`${API_BASE_URL}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) =>
            successCallback(data.map((e) => ({ ...e, id: e._id })))
          )
          .catch((err) => failureCallback(err));
      },
    });
    calendar.render();
  };
  const handleAddEvent = async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    const title = document.getElementById("eventTitle").value;
    const date = eventStartDateInput.value;
    const startTime = document.getElementById("eventStartTime").value;
    const endTime = document.getElementById("eventEndTime").value;
    const startDateTime = `${date}T${startTime}:00`;
    const endDateTime = `${date}T${endTime}:00`;
    try {
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          start: startDateTime,
          end: endDateTime,
          allDay: false,
        }),
      });
      if (response.ok) {
        eventForm.reset();
        eventModal.close();
        calendar.refetchEvents();
      } else {
        alert("Failed to save event.");
      }
    } catch (error) {
      alert("Error connecting to server.");
    }
  };
  const handleEventDelete = async (info) => {
    const token = getToken();
    const eventId = info.event.id;
    if (!token || !eventId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        info.event.remove();
      } else {
        alert("Failed to delete event.");
      }
    } catch (error) {
      alert("Error connecting to server.");
    }
  };

  //  Authentication Functions
  const handleRegistration = async (event) => {
    event.preventDefault();
    showMessage("register", "Registering...", false);
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        showMessage(
          "register",
          "Registration successful! Please click Login.",
          false
        );
        registerForm.reset();
      } else {
        showMessage("register", `Error: ${data.error}`, true);
      }
    } catch (error) {
      showMessage("register", "Could not connect to the server.", true);
    }
  };
  const handleLogin = async (event) => {
    event.preventDefault();
    showMessage("login", "Logging in...", false);
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        updateView();
      } else {
        showMessage("login", `Error: ${data.error}`, true);
      }
    } catch (error) {
      showMessage("login", "Could not connect to the server.", true);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    updateView();
  };

  //  EVENT LISTENERS
  if (registerForm) registerForm.addEventListener("submit", handleRegistration);
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (addSubjectForm)
    addSubjectForm.addEventListener("submit", handleAddSubject);
  if (eventForm) eventForm.addEventListener("submit", handleAddEvent);

  authNav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      e.preventDefault();
      showPage(`${e.target.dataset.page}`);
    }
  });

  mainDashboardNavLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      mainNav.style.display = "flex";
      const pageId = e.currentTarget.dataset.page;
      showPage(pageId);
      mainDashboardNavLinks.forEach((l) => l.classList.remove("active"));
      e.currentTarget.classList.add("active");
      if (pageId === "dashboard-page") fetchAndDisplaySubjects();
      if (pageId === "history-page") fetchHistory();
      if (pageId === "planner-page") initializeCalendar();
    });
  });

  welcomeNavButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const pageId = e.currentTarget.dataset.page;
      mainNav.style.display = "flex";
      showPage(pageId);
      mainDashboardNavLinks.forEach((link) => {
        if (link.dataset.page === pageId) {
          link.classList.add("active");
          if (pageId === "dashboard-page") fetchAndDisplaySubjects();
          if (pageId === "history-page") fetchHistory();
          if (pageId === "planner-page") initializeCalendar();
        } else {
          link.classList.remove("active");
        }
      });
    });
  });

  addSubjectBtn.addEventListener("click", () => subjectModal.showModal());
  subjectModal.addEventListener("click", (event) => {
    if (
      event.target === subjectModal ||
      event.target.classList.contains("close")
    )
      subjectModal.close();
  });

  eventModal.addEventListener("click", (event) => {
    if (event.target.classList.contains("close")) {
      eventModal.close();
    }
    if (event.target.nodeName === "DIALOG") {
      eventModal.close();
    }
  });

  if (brandLink) {
    brandLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (getToken()) showPage("welcome-page");
    });
  }

  // Initial Load
  updateView();
});
