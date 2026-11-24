/* =========================================
   PLMUN ROOM MANAGEMENT SYSTEM
   ADMIN AUTHENTICATION AND USER MANAGEMENT
========================================= */

(function () {
  "use strict";

  const loginScreen = document.getElementById("admin-login-screen");
  const adminHeader = document.getElementById("adminHeader");
  const adminDashboard = document.getElementById("adminDashboard");
  const loginForm = document.getElementById("adminLoginForm");
  const loginError = document.getElementById("adminLoginError");
  const loginButton = document.getElementById("adminLoginSubmit");
  const logoutButton = document.getElementById("adminLogoutBtn");
  const sessionLabel = document.getElementById("adminSessionLabel");

  let editModal;
  let userPasswordModal;

  /* =========================================
     HELPERS
  ========================================= */

  function escapeValue(value) {
    if (typeof window.escapeHTML === "function") {
      return window.escapeHTML(value);
    }

    return String(value ?? "").replace(/[&<>"']/g, function (character) {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };

      return entities[character];
    });
  }

  async function parseResponse(response) {
    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        "The server returned an invalid response. Check the PHP file.",
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || `Request failed (${response.status}).`);
    }

    return data;
  }

  function showMessage(message, isError = false) {
    if (typeof window.showToast === "function") {
      window.showToast(message, isError);
    } else {
      alert(message);
    }
  }

  function showLoginError(message) {
    if (!loginError) return;

    loginError.textContent = message;
    loginError.hidden = false;
  }

  function clearLoginError() {
    if (!loginError) return;

    loginError.textContent = "";
    loginError.hidden = true;
  }

  function openModal(modal) {
    if (!modal) return;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

    const form = modal.querySelector("form");

    if (form) {
      form.reset();
    }
  }

  function validPassword(password) {
    const byteLength = new TextEncoder().encode(password).length;

    return byteLength >= 8 && byteLength <= 72;
  }

  /* =========================================
     LOGIN AND LOGOUT
  ========================================= */

  function showLoginScreen() {
    if (loginScreen) {
      loginScreen.hidden = false;

      loginScreen.classList.remove("login-intro");
      void loginScreen.offsetWidth;
      loginScreen.classList.add("login-intro");
    }

    if (adminHeader) {
      adminHeader.hidden = true;
    }

    if (adminDashboard) {
      adminDashboard.hidden = true;
    }

    closeModal(userPasswordModal);
    closeModal(editModal);
  }

  async function loadDashboardData() {
    if (typeof window.loadRooms === "function") {
      await window.loadRooms();
    }

    if (typeof window.loadAdminUsers === "function") {
      await window.loadAdminUsers();
    }

    if (typeof window.loadAdminBookings === "function") {
      await window.loadAdminBookings();
    }
  }

  async function showAdminDashboard(admin) {
    if (loginScreen) loginScreen.hidden = true;
    if (adminHeader) adminHeader.hidden = false;
    if (adminDashboard) adminDashboard.hidden = false;

    if (sessionLabel) {
      sessionLabel.textContent =
        admin && admin.full_name
          ? `Signed in: ${admin.full_name}`
          : "Administrator";
    }

    clearLoginError();

    if (typeof window.showTodayDate === "function") {
      window.showTodayDate();
    }

    await loadDashboardData();
  }

  async function checkAdminSession() {
    try {
      const response = await fetch("check_session.php", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await parseResponse(response);

      await showAdminDashboard(data.admin);
    } catch (error) {
      showLoginScreen();
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearLoginError();

      const adminId = document.getElementById("adminLoginId").value.trim();

      const password = document.getElementById("adminLoginPassword").value;

      if (!adminId || !password) {
        showLoginError("Please enter your administrator ID and password.");
        return;
      }

      if (loginButton) {
        loginButton.disabled = true;

        const label = loginButton.querySelector("span:first-child");

        if (label) {
          label.textContent = "Logging in...";
        }
      }

      try {
        const response = await fetch("login.php", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            admin_id: adminId,
            password: password,
          }),
        });

        const data = await parseResponse(response);

        document.getElementById("adminLoginPassword").value = "";

        await showAdminDashboard(data.admin);
      } catch (error) {
        showLoginError(error.message || "Unable to log in. Please try again.");
      } finally {
        if (loginButton) {
          loginButton.disabled = false;

          const label = loginButton.querySelector("span:first-child");

          if (label) {
            label.textContent = "Login";
          }
        }
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async function () {
      logoutButton.disabled = true;
      logoutButton.textContent = "Logging out...";

      try {
        const response = await fetch("logout.php", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        await parseResponse(response);
      } catch (error) {
        console.error("Admin logout error:", error);
      } finally {
        if (loginForm) {
          loginForm.reset();
        }

        showLoginScreen();
        clearLoginError();

        logoutButton.disabled = false;
        logoutButton.textContent = "Log out";
      }
    });
  }

  /* =========================================
     CREATE EDIT AND USER PASSWORD MODALS
  ========================================= */

  function createManagementModals() {
    if (document.getElementById("editUserModal")) {
      editModal = document.getElementById("editUserModal");
      userPasswordModal = document.getElementById("changeUserPasswordModal");

      return;
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <!-- EDIT USER INFORMATION -->
      <div id="editUserModal" class="modal" aria-hidden="true">

        <div class="modal-content user-modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="editUserTitle">

          <button class="close-btn"
            type="button"
            data-close-management-modal="editUserModal"
            aria-label="Close dialog">
            &times;
          </button>

          <p class="modal-label">USER MANAGEMENT</p>

          <h2 id="editUserTitle">Edit User Information</h2>

          <p id="editUserDescription"
            style="margin:-10px 0 18px;color:#667085;font-size:12px;line-height:1.5;">
          </p>

          <form id="editUserForm" class="user-form">

            <input type="hidden"
              id="editUserRole"
              name="user_role">

            <input type="hidden"
              id="editUserId"
              name="user_id">

            <label for="editUserIdDisplay">User ID</label>

            <input type="text"
              id="editUserIdDisplay"
              readonly>

            <label for="editUserFullName">Full Name</label>

            <input type="text"
              id="editUserFullName"
              name="full_name"
              maxlength="150"
              required>

            <label for="editUserProgram" id="editUserProgramLabel">
              Course / Department
            </label>

            <input type="text"
              id="editUserProgram"
              name="program"
              maxlength="100"
              required>

            <label for="editUserAge">Age</label>

            <input type="number"
              id="editUserAge"
              name="age"
              min="16"
              max="100"
              required>

            <label for="editUserLevel" id="editUserLevelLabel">
              Year Level / Designation
            </label>

            <input type="text"
              id="editUserLevel"
              name="level"
              maxlength="50"
              required>

            <label for="editUserEmail">Email</label>

            <input type="text"
              id="editUserEmail"
              value="Sample"
              readonly>

            <button type="submit"
              class="save-btn"
              id="saveEditUserBtn">
              Save Changes
            </button>

          </form>
        </div>
      </div>

      <!-- CHANGE STUDENT OR PROFESSOR PASSWORD -->
      <div id="changeUserPasswordModal"
        class="modal"
        aria-hidden="true">

        <div class="modal-content user-modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changeUserPasswordTitle">

          <button class="close-btn"
            type="button"
            data-close-management-modal="changeUserPasswordModal"
            aria-label="Close dialog">
            &times;
          </button>

          <p class="modal-label">USER SECURITY</p>

          <h2 id="changeUserPasswordTitle">Change User Password</h2>

          <p id="changeUserPasswordTarget"
            style="margin:-10px 0 18px;color:#667085;font-size:12px;">
          </p>

          <form id="changeUserPasswordForm" class="user-form">

            <input type="hidden"
              id="passwordUserRole"
              name="user_role">

            <input type="hidden"
              id="passwordUserId"
              name="user_id">

            <label for="newUserAccountPassword">
              New Password
            </label>

            <input type="password"
              id="newUserAccountPassword"
              name="password"
              minlength="8"
              maxlength="72"
              autocomplete="new-password"
              required>

            <label for="confirmUserAccountPassword">
              Confirm New Password
            </label>

            <input type="password"
              id="confirmUserAccountPassword"
              minlength="8"
              maxlength="72"
              autocomplete="new-password"
              required>

            <p style="color:#778196;font-size:11px;line-height:1.5;">
              Use at least 8 characters. This password will be required the next time the user signs in.
            </p>

            <button type="submit"
              class="save-btn"
              id="saveUserPasswordBtn">
              Update Password
            </button>

          </form>
        </div>
      </div>
      `,
    );

    editModal = document.getElementById("editUserModal");

    userPasswordModal = document.getElementById("changeUserPasswordModal");

    /* CLOSE MODALS */
    document.addEventListener("click", function (event) {
      const closeButton = event.target.closest("[data-close-management-modal]");

      if (closeButton) {
        const modalId = closeButton.dataset.closeManagementModal;

        closeModal(document.getElementById(modalId));
        return;
      }

      [editModal, userPasswordModal].forEach(function (modal) {
        if (modal && event.target === modal) {
          closeModal(modal);
        }
      });
    });
  }

  /*
   * Create the required modals before registering their form
   * submission events.
   */
  createManagementModals();

  /* =========================================
     RENDER USER TABLE
  ========================================= */

  window.renderUserTable = function (bodyId, users, role) {
    const body = document.getElementById(bodyId);

    if (!body) return;

    const roleLabel = role === "STUDENT" ? "Student" : "Professor";
    const roleClass = role === "STUDENT" ? "student" : "professor";

    if (!Array.isArray(users) || users.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="7" class="table-empty">
            No ${roleLabel.toLowerCase()} accounts found.
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML = users
      .map(function (user, index) {
        const userId = escapeValue(user.user_id);
        const name = escapeValue(user.full_name);

        const program = escapeValue(
          role === "STUDENT" ? user.course : user.department,
        );

        const email = "Sample";
        const age = escapeValue(user.age);

        const level = escapeValue(
          role === "STUDENT" ? user.year_level : user.designation,
        );

        return `
          <tr>

            <td class="row-number">${index + 1}</td>

            <td class="user-name-cell">${name}</td>

            <td>
              <span class="table-id">${userId}</span>
            </td>

            <td>${program || "—"}</td>

            <td class="email-cell">${email}</td>

            <td>
              <span class="role-pill ${roleClass}">
                ${roleLabel}
              </span>
            </td>

            <td>
              <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">

                <button
                  type="button"
                  class="secondary-btn"
                  data-action="edit-user"
                  data-user-role="${role}"
                  data-user-id="${userId}"
                  data-user-name="${name}"
                  data-user-program="${program}"
                  data-user-age="${age}"
                  data-user-level="${level}">
                  Edit Info
                </button>

                <button
                  type="button"
                  class="edit-btn"
                  data-action="change-user-password"
                  data-user-role="${role}"
                  data-user-id="${userId}"
                  data-user-name="${name}">
                  Change Password
                </button>

                <button
                  type="button"
                  class="table-delete-btn"
                  data-action="delete-user"
                  data-user-role="${role}"
                  data-user-id="${userId}"
                  data-user-name="${name}">
                  Delete
                </button>

              </div>
            </td>

          </tr>
        `;
      })
      .join("");
  };

  /* =========================================
     LOAD USER ACCOUNTS
  ========================================= */

  window.loadAdminUsers = async function () {
    const studentBody = document.getElementById("studentsTableBody");
    const professorBody = document.getElementById("professorsTableBody");

    if (studentBody) {
      studentBody.innerHTML =
        '<tr><td colspan="7" class="table-empty">Loading students...</td></tr>';
    }

    if (professorBody) {
      professorBody.innerHTML =
        '<tr><td colspan="7" class="table-empty">Loading professors...</td></tr>';
    }

    try {
      const response = await fetch("get_users.php", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await parseResponse(response);

      window.renderUserTable(
        "studentsTableBody",
        data.students || [],
        "STUDENT",
      );

      window.renderUserTable(
        "professorsTableBody",
        data.professors || [],
        "PROFESSOR",
      );
    } catch (error) {
      console.error("Could not load user accounts:", error);

      if (studentBody) {
        studentBody.innerHTML = `
          <tr>
            <td colspan="7" class="table-error">
              ${escapeValue(error.message)}
            </td>
          </tr>
        `;
      }

      if (professorBody) {
        professorBody.innerHTML = `
          <tr>
            <td colspan="7" class="table-error">
              ${escapeValue(error.message)}
            </td>
          </tr>
        `;
      }
    }
  };

  /* =========================================
     OPEN EDIT USER MODAL
  ========================================= */

  function openEditUserModal(button) {
    const role = String(button.dataset.userRole || "").toUpperCase();
    const isStudent = role === "STUDENT";

    if (!isStudent && role !== "PROFESSOR") return;

    const form = document.getElementById("editUserForm");

    if (form) {
      form.reset();
    }

    document.getElementById("editUserRole").value = role;

    document.getElementById("editUserId").value = button.dataset.userId || "";

    document.getElementById("editUserIdDisplay").value =
      button.dataset.userId || "";

    document.getElementById("editUserFullName").value =
      button.dataset.userName || "";

    document.getElementById("editUserProgram").value = isStudent
      ? "BSIT"
      : button.dataset.userProgram || "";

    document.getElementById("editUserAge").value = button.dataset.userAge || "";

    document.getElementById("editUserLevel").value =
      button.dataset.userLevel || "";

    document.getElementById("editUserEmail").value = "Sample";

    document.getElementById("editUserProgramLabel").textContent = isStudent
      ? "Course"
      : "Department";

    document.getElementById("editUserLevelLabel").textContent = isStudent
      ? "Year Level"
      : "Designation";

    document.getElementById("editUserProgram").readOnly = isStudent;

    document.getElementById("editUserLevel").maxLength = isStudent ? 30 : 50;

    document.getElementById("editUserDescription").textContent = isStudent
      ? "Edit the student's details. Student ID and BSIT course cannot be changed."
      : "Edit the professor's details. Professor ID cannot be changed.";

    openModal(editModal);

    setTimeout(function () {
      document.getElementById("editUserFullName").focus();
    }, 50);
  }

  /* =========================================
     SAVE EDITED USER INFORMATION
  ========================================= */

  document
    .getElementById("editUserForm")
    .addEventListener("submit", async function (event) {
      event.preventDefault();

      const form = event.currentTarget;
      const saveButton = document.getElementById("saveEditUserBtn");
      const role = document.getElementById("editUserRole").value;

      const formData = new FormData(form);

      if (role === "STUDENT") {
        formData.set("program", "BSIT");
      }

      try {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        const response = await fetch("update_user.php", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          body: formData,
        });

        const data = await parseResponse(response);

        closeModal(editModal);

        await window.loadAdminUsers();

        showMessage(data.message || "User information updated successfully.");
      } catch (error) {
        console.error("Edit user error:", error);

        showMessage(
          error.message || "Unable to update user information.",
          true,
        );
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
      }
    });

  /* =========================================
     OPEN USER PASSWORD MODAL
  ========================================= */

  function openUserPasswordModal(button) {
    const form = userPasswordModal.querySelector("form");

    if (!form) return;

    form.reset();

    document.getElementById("passwordUserRole").value =
      button.dataset.userRole || "";

    document.getElementById("passwordUserId").value =
      button.dataset.userId || "";

    document.getElementById("changeUserPasswordTarget").textContent =
      `Account: ${button.dataset.userName || ""} (${button.dataset.userId || ""})`;

    openModal(userPasswordModal);

    setTimeout(function () {
      document.getElementById("newUserAccountPassword").focus();
    }, 50);
  }

  /* =========================================
     SAVE USER PASSWORD
  ========================================= */

  const changeUserPasswordForm = userPasswordModal.querySelector("form");

  if (changeUserPasswordForm) {
    changeUserPasswordForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const form = event.currentTarget;

      const password = document.getElementById("newUserAccountPassword").value;

      const confirmation = document.getElementById(
        "confirmUserAccountPassword",
      ).value;

      const saveButton = document.getElementById("saveUserPasswordBtn");

      if (!validPassword(password)) {
        showMessage("Password must be 8 to 72 bytes long.", true);
        return;
      }

      if (password !== confirmation) {
        showMessage("The passwords do not match.", true);
        return;
      }

      try {
        saveButton.disabled = true;
        saveButton.textContent = "Updating...";

        const response = await fetch("change_user_password.php", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          body: new FormData(form),
        });

        const data = await parseResponse(response);

        closeModal(userPasswordModal);

        showMessage(data.message || "User password updated successfully.");
      } catch (error) {
        console.error("Change user password error:", error);

        showMessage(error.message || "Unable to update the password.", true);
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Update Password";
      }
    });
  }

  /* =========================================
     USER TABLE ACTIONS
  ========================================= */

  document.addEventListener("click", function (event) {
    const editButton = event.target.closest('button[data-action="edit-user"]');

    if (editButton) {
      openEditUserModal(editButton);
      return;
    }

    const passwordButton = event.target.closest(
      'button[data-action="change-user-password"]',
    );

    if (passwordButton) {
      openUserPasswordModal(passwordButton);
    }
  });

  /* =========================================
     ADD USER ROLE FIELD
  ========================================= */

  function updateStudentCourseField() {
    const role = document.getElementById("newUserRole");
    const programInput = document.getElementById("newUserProgram");

    if (!role || !programInput) return;

    const isStudent = role.value === "STUDENT";

    programInput.readOnly = isStudent;

    if (isStudent) {
      programInput.value = "BSIT";
    } else if (programInput.value === "BSIT") {
      programInput.value = "";
    }
  }

  const openAddUserButton = document.getElementById("openAddUserBtn");

  if (openAddUserButton) {
    openAddUserButton.addEventListener("click", updateStudentCourseField);
  }

  const roleSelect = document.getElementById("newUserRole");

  if (roleSelect) {
    roleSelect.addEventListener("change", updateStudentCourseField);

    updateStudentCourseField();
  }

  /* =========================================
     INITIALIZE
  ========================================= */

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal(editModal);
      closeModal(userPasswordModal);
    }
  });

  document.addEventListener("DOMContentLoaded", checkAdminSession);
})();
