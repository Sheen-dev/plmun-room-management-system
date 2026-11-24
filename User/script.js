/* =========================================
   PLMUN ROOM MANAGEMENT SYSTEM — USER DASHBOARD
   Database-connected room directory
   ========================================= */

const API_BASE = "../admin/";

const state = {
  currentUser: null,
  activeBuilding: "Building A",
  searchQuery: "",
  rooms: [],
  bookings: [],
  history: [],
  loading: false,
};

const BUILDINGS = {
  "Building A": "A",
  "Building B": "B",
  "Building C": "C",
};

/* =========================================
   INITIALIZATION
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  renderAnimatedH3("PLMun Room Management System");
  renderHistory();
  updatePhilippineClock();
  setInterval(updatePhilippineClock, 1000);

  // Start with the logged-out layout.
  // The login screen is the initial visible page.
  updateLoggedOutInterface();

  // Check whether a valid PHP login session already exists.
  restoreLoginSession();
});

/* =========================================
   PHILIPPINE DATE AND TIME
   ========================================= */

function updatePhilippineClock() {
  const dateElement = getElement("philippine-date");
  const timeElement = getElement("philippine-time");

  const now = new Date();

  if (dateElement) {
    dateElement.textContent = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now);
  }

  if (timeElement) {
    timeElement.textContent = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now);
  }
}

/* =========================================
   HELPER FUNCTIONS
   ========================================= */

function getElement(id) {
  return document.getElementById(id);
}

/* =========================================
   AUTHENTICATION LAYOUT
   ========================================= */

function updateAuthLayout() {
  const header = getElement("site-header");
  const footer = getElement("site-footer");

  const isAuthenticated = Boolean(state.currentUser);

  // Hide the header while the login page is active.
  if (header) {
    header.hidden = !isAuthenticated;
    header.style.display = isAuthenticated ? "" : "none";
  }

  // Also hide footer navigation while logged out.
  if (footer) {
    footer.hidden = !isAuthenticated;
    footer.style.display = isAuthenticated ? "" : "none";
  }
}

/* =========================================
   HTML ESCAPING
   ========================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
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

/* =========================================
   TIME FORMATTING
   ========================================= */

function formatTime(time) {
  if (!time) return "";

  const parts = time.split(":");

  if (parts.length < 2) return time;

  let hours = Number(parts[0]);
  const minutes = parts[1];

  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${period}`;
}

function formatSchedule(schedule) {
  return `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`;
}

/* =========================================
   ACTIVITY HISTORY
   ========================================= */

function addHistory(action) {
  const now = new Date();

  state.history.unshift({
    action,
    time: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  renderHistory();
}

function showMessage(container, message) {
  if (!container) return;

  container.innerHTML = `
        <p class="text-sm text-zinc-500 col-span-full py-6 text-center">
            ${escapeHTML(message)}
        </p>
    `;
}

/* =========================================
   ANIMATED HERO HEADING
   ========================================= */

function renderAnimatedH3(text) {
  const heading = getElement("animated-hero-heading");

  if (!heading) return;

  heading.innerHTML = "";

  const words = text.split(" ");
  let characterCount = 0;

  words.forEach((word) => {
    const wordSpan = document.createElement("span");

    wordSpan.className = "inline-block whitespace-nowrap mr-3";

    for (let index = 0; index < word.length; index++) {
      const characterSpan = document.createElement("span");

      characterSpan.className = "stagger-char";
      characterSpan.textContent = word[index];
      characterSpan.style.animationDelay = `${characterCount * 0.035}s`;

      wordSpan.appendChild(characterSpan);
      characterCount++;
    }

    heading.appendChild(wordSpan);
  });
}

/* =========================================
   VIEW NAVIGATION
   ========================================= */

function navigateTo(viewId) {
  // Logged-out users can only see the login page.
  if (!state.currentUser && viewId !== "login-view") {
    viewId = "login-view";
  }

  // Do not allow navigation to the login page while authenticated.
  if (state.currentUser && viewId === "login-view") {
    viewId = "home-view";
  }

  document.querySelectorAll(".view-panel").forEach((panel) => {
    panel.classList.add("hidden");
    panel.classList.remove("flex");
  });

  const target = getElement(viewId);

  if (!target) return;

  target.classList.remove("hidden");
  target.classList.add("flex");

  // Replay the login entrance whenever the user is sent back to sign-in.
  if (viewId === "login-view") {
    target.classList.remove("login-view-intro");
    void target.offsetWidth;
    target.classList.add("login-view-intro");
  }

  // Keep header and footer visibility synchronized with login state.
  updateAuthLayout();

  // Switch views at the top immediately. Smooth scrolling can leave a blank
  // part of the previous long page visible while the browser is still moving.
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
}

/* =========================================
   BUILDING SELECTION
   ========================================= */

async function selectBuilding(buildingName) {
  if (!state.currentUser) {
    navigateTo("login-view");
    return;
  }

  if (!BUILDINGS[buildingName]) return;

  state.activeBuilding = buildingName;

  const welcomeMessage = getElement("welcome-message");
  const accountBuilding = getElement("account-active-bldg");

  if (welcomeMessage) {
    welcomeMessage.textContent = `Welcome to ${buildingName}`;
  }

  if (accountBuilding) {
    accountBuilding.textContent = buildingName;
  }

  const buttonIds = ["btn-bldg-a", "btn-bldg-b", "btn-bldg-c"];

  Object.entries(BUILDINGS).forEach(([name], index) => {
    const button = getElement(buttonIds[index]);

    if (!button) return;

    if (name === buildingName) {
      button.className =
        "building-btn active-bldg px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all bg-white text-plmun-green shadow-sm";
    } else {
      button.className =
        "building-btn px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all text-white/80 hover:text-white";
    }
  });

  await loadRooms();

  if (state.searchQuery) {
    executeSearch();
  }

  addHistory(`Switched to ${buildingName} Directory`);
}

/* =========================================
   LOAD ROOMS FROM DATABASE
   ========================================= */

async function loadRooms() {
  const roomContainer = getElement("room-list-container");

  if (!roomContainer) return;

  if (!state.currentUser) {
    roomContainer.innerHTML = "";
    return;
  }

  state.loading = true;

  showMessage(roomContainer, "Loading rooms...");

  try {
    const response = await fetch(`${API_BASE}get_rooms.php`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to connect to the room API.");
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.rooms)) {
      throw new Error(data.message || "Unable to load rooms.");
    }

    const buildingCode = BUILDINGS[state.activeBuilding];

    const buildingRooms = data.rooms.filter(
      (room) => String(room.building_code).toUpperCase() === buildingCode,
    );

    // Load the actual schedules for each room.
    const roomsWithSchedules = await Promise.all(
      buildingRooms.map(async (room) => {
        try {
          const scheduleResponse = await fetch(
            `${API_BASE}get_room_schedule.php?room_id=${encodeURIComponent(room.id)}`,
            { cache: "no-store" },
          );

          if (!scheduleResponse.ok) {
            throw new Error("Unable to load room schedule.");
          }

          const scheduleData = await scheduleResponse.json();

          return {
            ...room,
            schedules:
              scheduleData.success && Array.isArray(scheduleData.schedules)
                ? scheduleData.schedules
                : [],
          };
        } catch (error) {
          console.error(`Schedule error for room ${room.room_number}:`, error);

          return {
            ...room,
            schedules: [],
            scheduleError: true,
          };
        }
      }),
    );

    // Load today's bookings so booked times can be removed.
    const bookingResponse = await fetch("get_bookings.php", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!bookingResponse.ok) {
      throw new Error("Unable to load today's bookings.");
    }

    const bookingData = await bookingResponse.json();

    if (!bookingData.success || !Array.isArray(bookingData.bookings)) {
      throw new Error(bookingData.message || "Unable to load bookings.");
    }

    state.bookings = bookingData.bookings;
    state.rooms = roomsWithSchedules;

    renderRooms();

    if (state.searchQuery) {
      executeSearch();
    }
  } catch (error) {
    console.error("Room loading error:", error);

    state.rooms = [];

    showMessage(
      roomContainer,
      "Unable to load rooms or booking information. Please check your connection.",
    );

    updateStatistics(0, 0);
  } finally {
    state.loading = false;
  }
}

/* =========================================
   CURRENT ROOM STATUS
   ========================================= */

function getPhilippineTimeParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = {};

  parts.forEach((part) => {
    values[part.type] = part.value;
  });

  return {
    day: values.weekday,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function timeToMinutes(time) {
  if (!time) return 0;

  const [hours, minutes] = String(time).split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToInput(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");

  return `${h}:${m}`;
}

/* =========================================
   GET REMAINING AVAILABLE TIMES
   ========================================= */

function getTodayAvailableSchedules(room) {
  const now = getPhilippineTimeParts();

  const roomBookings = (state.bookings || []).filter(
    (item) => Number(item.room_id) === Number(room.id),
  );

  // Round up to the next 30-minute boundary.
  const earliestStart = Math.ceil((now.minutes + 1) / 30) * 30;

  const availableRanges = [];

  (room.schedules || []).forEach((schedule) => {
    const sameDay =
      String(schedule.day_of_week).toLowerCase() === now.day.toLowerCase();

    const isAvailable =
      String(schedule.status || "")
        .trim()
        .toLowerCase() === "available";

    if (!sameDay || !isAvailable) return;

    const slotStart = timeToMinutes(schedule.start_time);
    const slotEnd = timeToMinutes(schedule.end_time);

    if (slotEnd <= earliestStart) return;

    let freeRanges = [
      {
        start: slotStart,
        end: slotEnd,
      },
    ];

    // Remove every booking interval from the available schedule.
    roomBookings.forEach((bookingItem) => {
      const bookedStart = timeToMinutes(bookingItem.start_time);
      const bookedEnd = timeToMinutes(bookingItem.end_time);

      freeRanges = freeRanges.flatMap((range) => {
        if (bookedEnd <= range.start || bookedStart >= range.end) {
          return [range];
        }

        const remaining = [];

        if (bookedStart > range.start) {
          remaining.push({
            start: range.start,
            end: Math.min(bookedStart, range.end),
          });
        }

        if (bookedEnd < range.end) {
          remaining.push({
            start: Math.max(bookedEnd, range.start),
            end: range.end,
          });
        }

        return remaining.filter((part) => part.end > part.start);
      });
    });

    freeRanges.forEach((range) => {
      const start = Math.max(range.start, earliestStart);
      const end = range.end;

      if (end - start >= 30) {
        availableRanges.push({
          ...schedule,
          start_time: minutesToInput(start),
          end_time: minutesToInput(end),
          status: "available",
        });
      }
    });
  });

  return availableRanges.sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
  );
}

function getRoomStatus(room) {
  const availableSchedules = getTodayAvailableSchedules(room);

  if (availableSchedules.length === 0) {
    return {
      label: "No Active Schedule",
      available: false,
      schedules: [],
    };
  }

  return {
    label: "Available",
    available: true,
    schedules: availableSchedules,
  };
}

/* =========================================
   ROOM STATISTICS
   ========================================= */

function updateStatistics(total, available) {
  const totalElement = getElement("stat-total-rooms");
  const availableElement = getElement("stat-available");

  if (totalElement) {
    totalElement.textContent = String(total).padStart(2, "0");
  }

  if (availableElement) {
    availableElement.textContent = String(available).padStart(2, "0");
  }
}

/* =========================================
   RESTORE LOGIN SESSION
   ========================================= */

async function restoreLoginSession() {
  try {
    const response = await fetch("check_session.php", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to check login session.");
    }

    const data = await response.json();

    if (data.success && data.user) {
      state.currentUser = data.user;

      updateLoggedInInterface(data.user);

      // A valid existing session opens the main room interface.
      navigateTo("home-view");

      // Load room data only after the user is authenticated.
      await loadRooms();
    } else {
      state.currentUser = null;

      updateLoggedOutInterface();

      navigateTo("login-view");
    }
  } catch (error) {
    console.error("Session restoration error:", error);

    state.currentUser = null;

    updateLoggedOutInterface();

    navigateTo("login-view");
  }
}

/* =========================================
   UPDATE HEADER AND ACCOUNT
   ========================================= */

function updateLoggedInInterface(user) {
  if (!user) return;

  // Show header and footer after successful login.
  updateAuthLayout();

  const navAuthButton = getElement("nav-auth-btn");
  const accountId = getElement("account-user-id");
  const accountRole = getElement("account-user-role");
  const accountStatus = getElement("account-status-badge");
  const accountDetails = getElement("account-details");

  const role = String(user.role || "").toUpperCase();
  const isStudent = role === "STUDENT";

  const roleLabel = isStudent ? "Student Account" : "Professor Account";
  const idLabel = isStudent ? "Student Number" : "Professor ID";

  if (navAuthButton) {
    navAuthButton.innerHTML = `
      <button
        type="button"
        onclick="navigateTo('account-view')"
        class="bg-plmun-green hover:bg-plmun-lightgreen text-white text-xs tracking-wider font-semibold px-5 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-sm">
        <i class="fa-solid fa-user-circle"></i>
        <span>Welcome, ${escapeHTML(user.user_id)}</span>
      </button>
    `;
  }

  if (accountId) {
    accountId.textContent = user.full_name || user.user_id;
  }

  if (accountRole) {
    accountRole.textContent = roleLabel;
  }

  if (accountStatus) {
    accountStatus.textContent = "Logged In";
    accountStatus.className = "account-status logged-in";
  }

  if (accountDetails) {
    const details = [
      ["Full Name", user.full_name, "fa-user"],
      [idLabel, user.user_id, "fa-id-card"],
      ["Age", user.age, "fa-calendar"],
      ["Role", roleLabel, "fa-user-shield"],
    ];

    if (isStudent) {
      details.push(
        ["Course", user.course, "fa-graduation-cap"],
        ["Year Level", user.year_level, "fa-layer-group"],
      );
    } else {
      details.push(
        ["Department", user.department, "fa-building"],
        ["Designation", user.designation, "fa-briefcase"],
      );
    }

    accountDetails.className = "account-details-grid";

    accountDetails.innerHTML = details
      .map(
        ([label, value, icon]) => `
          <div class="account-info-card">
            <div class="account-info-icon">
              <i class="fa-solid ${icon}"></i>
            </div>

            <div class="account-info-content">
              <span class="account-info-label">
                ${escapeHTML(label)}
              </span>

              <span class="account-info-value">
                ${escapeHTML(value || "—")}
              </span>
            </div>
          </div>
        `,
      )
      .join("");
  }
}

function updateLoggedOutInterface() {
  // Hide header and footer while logged out.
  updateAuthLayout();

  const navAuthButton = getElement("nav-auth-btn");
  const accountId = getElement("account-user-id");
  const accountRole = getElement("account-user-role");
  const accountStatus = getElement("account-status-badge");
  const accountDetails = getElement("account-details");

  if (navAuthButton) {
    navAuthButton.innerHTML = `
      <button
        type="button"
        onclick="navigateTo('login-view')"
        class="bg-plmun-green hover:bg-plmun-lightgreen text-white text-xs tracking-wider uppercase font-semibold px-5 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-sm">
        <span>Login</span>
        <i class="fa-solid fa-arrow-right text-[10px]"></i>
      </button>
    `;
  }

  if (accountId) {
    accountId.textContent = "Not Logged In";
  }

  if (accountRole) {
    accountRole.textContent = "Guest Session";
  }

  if (accountStatus) {
    accountStatus.textContent = "Logged Out";
    accountStatus.className = "account-status logged-out";
  }

  if (accountDetails) {
    accountDetails.className = "account-details-grid";

    accountDetails.innerHTML = `
      <div class="account-empty-state">
        <i class="fa-solid fa-lock"></i>
        <p>Please log in to view your personal information.</p>
      </div>
    `;
  }
}

/* =========================================
   RENDER ROOM DIRECTORY
   ========================================= */

function renderRooms() {
  const container = getElement("room-list-container");

  if (!container) return;

  container.innerHTML = "";

  if (state.rooms.length === 0) {
    showMessage(container, "No rooms found in this building.");
    updateStatistics(0, 0);
    return;
  }

  const visibleRooms = state.rooms.filter(
    (room) => getRoomStatus(room).available,
  );

  if (visibleRooms.length === 0) {
    showMessage(container, "No rooms have an available time today.");
    updateStatistics(state.rooms.length, 0);
    return;
  }

  visibleRooms.forEach((room) => {
    const roomStatus = getRoomStatus(room);

    const roomNumber = escapeHTML(room.room_number);
    const buildingName = escapeHTML(room.building_name);

    const scheduleHTML = roomStatus.schedules
      .map(
        (schedule) => `
          <div class="room-schedule-item">
            <span>${escapeHTML(schedule.day_of_week)}</span>
            <span>${escapeHTML(formatSchedule(schedule))}</span>
          </div>
        `,
      )
      .join("");

    const card = document.createElement("div");

    card.className =
      "bg-white rounded-2xl p-5 flex flex-col justify-between border border-zinc-200/80 shadow-sm hover:border-plmun-green/40 hover:shadow-md transition-all duration-300 group";

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">
            ${buildingName}
          </span>

          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]"></span>
        </div>

        <h5 class="text-xl font-bold text-zinc-900 group-hover:text-plmun-green transition-colors">
          Room ${roomNumber}
        </h5>

        <div class="mt-3 space-y-2">
          ${scheduleHTML}
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
        <span class="text-emerald-600 text-xs font-semibold">
          Available
        </span>

        <button
          type="button"
          onclick="bookRoom(${Number(room.id)})"
          class="bg-plmun-green hover:bg-plmun-lightgreen cursor-pointer text-white px-4 py-1.5 rounded-full font-semibold text-[11px] transition-all">
          Book
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  updateStatistics(state.rooms.length, visibleRooms.length);
}

/* =========================================
   VIEW ROOM SCHEDULE
   ========================================= */

function showRoomSchedule(roomId) {
  const room = state.rooms.find((item) => Number(item.id) === Number(roomId));

  if (!room) return;

  if (!room.schedules.length) {
    alert("There are no schedules recorded for this room.");
    return;
  }

  const scheduleLines = room.schedules.map((schedule) => {
    return [
      schedule.day_of_week,
      formatSchedule(schedule),
      schedule.status,
    ].join(" — ");
  });

  alert(`Room ${room.room_number}\n\n` + scheduleLines.join("\n"));
}

/* =========================================
   SEARCH INPUT
   ========================================= */

function handleSearchTrigger() {
  if (!state.currentUser) {
    navigateTo("login-view");
    return;
  }

  const input = getElement("main-search-input");

  if (!input) return;

  state.searchQuery = input.value.trim();

  if (state.searchQuery.length > 0) {
    executeSearch();
  } else {
    clearSearch();
  }
}

/* =========================================
   SEARCH AND COMPARISON
   ========================================= */

function executeSearch() {
  if (!state.currentUser) {
    navigateTo("login-view");
    return;
  }

  const wrapper = getElement("search-results-wrapper");
  const container = getElement("search-results-container");
  const input = getElement("main-search-input");

  if (!wrapper || !container || !input) return;

  const query = input.value.trim().toLowerCase();

  state.searchQuery = input.value.trim();

  wrapper.classList.remove("hidden");
  container.innerHTML = "";

  const matchingRooms = state.rooms.filter((room) => {
    const availableSchedules = getTodayAvailableSchedules(room);

    if (availableSchedules.length === 0) return false;

    const roomNumber = String(room.room_number).toLowerCase();
    const buildingText = String(room.building_name || "").toLowerCase();

    const schedulesText = availableSchedules
      .map((schedule) =>
        [
          schedule.day_of_week,
          schedule.start_time,
          schedule.end_time,
          formatSchedule(schedule),
        ].join(" "),
      )
      .join(" ")
      .toLowerCase();

    if (/^\d+$/.test(query)) {
      return roomNumber.includes(query);
    }

    return (
      roomNumber.includes(query) ||
      `room ${roomNumber}`.includes(query) ||
      schedulesText.includes(query) ||
      buildingText.includes(query)
    );
  });

  if (matchingRooms.length === 0) {
    showMessage(container, "No matching available classroom times found.");
  } else {
    matchingRooms.forEach((room) => {
      const availableSchedules = getTodayAvailableSchedules(room);

      const scheduleHTML = availableSchedules
        .map(
          (schedule) => `
            <div class="room-schedule-item">
              <span>${escapeHTML(schedule.day_of_week)}</span>
              <span>${escapeHTML(formatSchedule(schedule))}</span>
            </div>
          `,
        )
        .join("");

      const card = document.createElement("div");

      card.className =
        "bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm";

      card.innerHTML = `
        <div>
          <div class="flex justify-between items-center mb-2 gap-2">
            <span class="text-xs font-mono text-plmun-green font-bold">
              ${escapeHTML(room.building_name)}
            </span>

            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-700">
              Available
            </span>
          </div>

          <h5 class="text-lg font-bold text-zinc-900">
            Room ${escapeHTML(room.room_number)}
          </h5>

          <div class="mt-3 space-y-2">
            ${scheduleHTML}
          </div>
        </div>

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            onclick="bookRoom(${Number(room.id)})"
            class="bg-plmun-green hover:bg-plmun-lightgreen text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all">
            Book
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  }

  addHistory(`Searched "${state.searchQuery}" in ${state.activeBuilding}`);
}

/* =========================================
   CLEAR SEARCH
   ========================================= */

function clearSearch() {
  const input = getElement("main-search-input");
  const wrapper = getElement("search-results-wrapper");

  if (input) {
    input.value = "";
  }

  if (wrapper) {
    wrapper.classList.add("hidden");
  }

  state.searchQuery = "";
}

/* =========================================
   LOGIN FORM
   ========================================= */

function clearLoginErrors() {
  document.querySelectorAll(".login-input").forEach((input) => {
    input.classList.remove("input-error");
  });

  const errorElement = getElement("login-error");

  if (errorElement) {
    errorElement.classList.add("hidden");
    errorElement.textContent = "";
  }
}

function showLoginError(message) {
  const errorElement = getElement("login-error");

  document.querySelectorAll(".login-input").forEach((input) => {
    input.classList.remove("input-error");

    void input.offsetWidth;

    input.classList.add("input-error");
  });

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".login-input").forEach((input) => {
    input.addEventListener("input", () => {
      input.classList.remove("input-error");
    });
  });
});

async function handleLogin(event) {
  event.preventDefault();

  const userId = getElement("user-id").value.trim();
  const password = getElement("password").value;

  const button =
    event.submitter ||
    document.querySelector('#login-form button[type="submit"]');

  clearLoginErrors();

  if (!userId || !password) {
    showLoginError("Please enter your user ID and password.");
    return;
  }

  if (button) button.disabled = true;

  try {
    const response = await fetch("login.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        user_id: userId,
        password: password,
      }),
    });

    const responseText = await response.text();

    console.log("Login HTTP status:", response.status);
    console.log("Login server response:", responseText);

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(
        "The server did not return valid JSON. Check login.php for PHP errors.",
      );
    }

    if (!response.ok || !data.success) {
      showLoginError(data.message || "Wrong user ID or password.");
      return;
    }

    state.currentUser = data.user;

    updateLoggedInInterface(data.user);

    getElement("password").value = "";

    // Move into the main interface after a successful login.
    navigateTo("home-view");

    // Load the room directory only after authentication.
    await loadRooms();
  } catch (error) {
    console.error("Login error:", error);

    showLoginError(error.message || "Unable to connect. Please try again.");
  } finally {
    if (button) button.disabled = false;
  }
}

/* =========================================
   LOGOUT
   ========================================= */

async function handleLogout() {
  try {
    const response = await fetch("logout.php", {
      method: "POST",
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Logout request failed.");
    }

    // Clear the current user's application state.
    state.currentUser = null;
    state.bookings = [];
    state.rooms = [];
    state.searchQuery = "";

    // Hide navigation and restore the logged-out interface.
    updateLoggedOutInterface();

    // Clear login fields for the next user.
    const userIdInput = getElement("user-id");
    const passwordInput = getElement("password");

    if (userIdInput) userIdInput.value = "";
    if (passwordInput) passwordInput.value = "";

    clearLoginErrors();

    // Return to the login page.
    navigateTo("login-view");

    alert("You have been logged out.");
  } catch (error) {
    console.error("Logout error:", error);
    alert("Unable to log out. Please try again.");
  }
}

/* =========================================
   HISTORY DISPLAY
   ========================================= */

function renderHistory() {
  const container = getElement("history-list-container");

  if (!container) return;

  container.innerHTML = "";

  if (state.history.length === 0) {
    showMessage(container, "No activity recorded in this session.");
    return;
  }

  state.history.forEach((item) => {
    const row = document.createElement("div");

    row.className =
      "flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-200/80 text-sm shadow-sm gap-4";

    row.innerHTML = `
      <div class="flex items-center gap-3">
        <i class="fa-solid fa-bolt text-plmun-green"></i>

        <span class="text-zinc-700 font-medium">
          ${escapeHTML(item.action)}
        </span>
      </div>

      <span class="text-xs font-mono text-zinc-400 whitespace-nowrap">
        ${escapeHTML(item.time)}
      </span>
    `;

    container.appendChild(row);
  });
}

/* =========================================
   BOOKING WINDOW
   ========================================= */

const booking = {
  room: null,
  slots: [],
  slot: null,
};

const BOOKING_DURATIONS = [
  { minutes: 30, label: "30 mins" },
  { minutes: 60, label: "1 hr" },
  { minutes: 90, label: "1 hr 30 mins" },
  { minutes: 120, label: "2 hrs" },
  { minutes: 150, label: "2 hrs 30 mins" },
  { minutes: 180, label: "3 hrs" },
  { minutes: 210, label: "3 hrs 30 mins" },
  { minutes: 240, label: "4 hrs" },
];

/* =========================================
   BOOKING DURATION FORMATTING
   ========================================= */

function formatBookingDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
  }

  if (remainder > 0) {
    parts.push(`${remainder} min${remainder === 1 ? "" : "s"}`);
  }

  return parts.join(" ");
}

/* =========================================
   OPEN BOOKING WINDOW
   ========================================= */

function bookRoom(roomId) {
  if (!state.currentUser) {
    navigateTo("login-view");
    return;
  }

  const room = state.rooms.find((item) => Number(item.id) === Number(roomId));

  if (!room) {
    alert("Room not found.");
    return;
  }

  const availableSchedules = getTodayAvailableSchedules(room);

  if (availableSchedules.length === 0) {
    alert("This room has no available time remaining today.");
    return;
  }

  openBookingModal(room, availableSchedules);
}

function openBookingModal(room, schedules) {
  booking.room = room;
  booking.slots = schedules;
  booking.slot = null;

  getElement("booking-title").textContent =
    `Room ${room.room_number} — ${room.building_name}`;

  getElement("booking-slots").innerHTML = schedules
    .map(
      (schedule, index) => `
        <label class="flex items-center gap-3 p-3 rounded-2xl border border-zinc-200 hover:border-plmun-green hover:bg-emerald-50/50 cursor-pointer transition-colors">
          <input type="radio"
            name="booking-slot"
            value="${index}"
            onchange="selectSlot(${index})"
            class="w-4 h-4 accent-emerald-700">

          <span class="flex-1 min-w-0">
            <span class="block text-sm font-semibold text-zinc-800">
              ${escapeHTML(formatSchedule(schedule))}
            </span>

            <span class="block mt-0.5 text-xs text-emerald-700">
              Available time
            </span>
          </span>

          <i class="fa-solid fa-chevron-right text-xs text-zinc-400"></i>
        </label>
      `,
    )
    .join("");

  const details = getElement("booking-details");

  details.classList.add("hidden");

  details.innerHTML = `
    <div id="booking-controls" class="space-y-4">

      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p class="text-[10px] font-bold tracking-[0.16em] uppercase text-emerald-700">
          Available time selected
        </p>

        <p id="booking-selected-window"
          class="mt-1 text-base font-extrabold text-emerald-900">
          —
        </p>

        <p class="mt-1 text-xs text-emerald-800">
          Only the time you choose will be booked. Any unused time stays available.
        </p>
      </div>

      <div>
        <label for="booking-hours"
          class="block text-sm font-bold text-zinc-800 mb-2">
          How long do you need the room?
        </label>

        <select id="booking-hours"
          onchange="applyHours()"
          class="w-full border border-zinc-200 bg-white rounded-xl px-4 py-3 text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-plmun-green">
          <option value="">Choose duration</option>
        </select>

        <p class="mt-1.5 text-xs text-zinc-500">
          Choose from 30 minutes up to 4 hours, depending on the available time.
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 focus-within:border-plmun-green focus-within:ring-2 focus-within:ring-emerald-100">

          <label for="booking-time-in"
            class="block text-[10px] font-bold tracking-[0.14em] uppercase text-zinc-500 mb-2">
            Time In · Start
          </label>

          <input type="time"
            id="booking-time-in"
            step="1800"
            oninput="handleTimeInChange()"
            class="w-full min-w-0 bg-transparent text-xl font-extrabold text-zinc-900 outline-none">

          <p class="mt-1.5 text-[11px] text-zinc-500">
            When you need the room.
          </p>
        </div>

        <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 focus-within:border-plmun-green focus-within:ring-2 focus-within:ring-emerald-100">

          <label for="booking-time-out"
            class="block text-[10px] font-bold tracking-[0.14em] uppercase text-zinc-500 mb-2">
            Time Out · End
          </label>

          <input type="time"
            id="booking-time-out"
            step="1800"
            oninput="handleTimeOutChange()"
            class="w-full min-w-0 bg-transparent text-xl font-extrabold text-zinc-900 outline-none">

          <p class="mt-1.5 text-[11px] text-zinc-500">
            Calculated automatically; editable.
          </p>
        </div>

      </div>

      <button type="button"
        onclick="resetBookingTimes()"
        class="inline-flex items-center gap-2 text-xs font-semibold text-plmun-green hover:text-emerald-800 transition-colors">

        <i class="fa-solid fa-rotate-left"></i>
        Use suggested time again
      </button>

      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4"
        aria-live="polite">

        <div class="flex items-center gap-2 text-emerald-700">
          <i class="fa-solid fa-calendar-check"></i>

          <p class="text-[10px] font-bold tracking-[0.16em] uppercase">
            Preferred booking time
          </p>
        </div>

        <p id="booking-preferred"
          class="mt-2 text-lg sm:text-xl font-extrabold text-plmun-green">
          —
        </p>

        <p class="mt-1 text-xs text-emerald-800">
          Review this time before confirming your booking.
        </p>

      </div>

      <p id="booking-error"
        class="hidden rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
        role="alert">
      </p>

    </div>
  `;

  getElement("booking-submit").disabled = true;
  getElement("booking-submit").textContent = "Confirm Booking";

  const modal = getElement("booking-modal");

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeBookingModal() {
  const modal = getElement("booking-modal");

  modal.classList.add("hidden");
  modal.classList.remove("flex");

  booking.slot = null;
}

/* =========================================
   DURATION OPTIONS
   ========================================= */

function getAvailableDurations(maxMinutes) {
  return BOOKING_DURATIONS.filter((item) => item.minutes <= maxMinutes);
}

function setDurationOptions(maxMinutes, selectedMinutes = 30) {
  const select = getElement("booking-hours");

  const durations = getAvailableDurations(maxMinutes);

  select.innerHTML =
    '<option value="">Choose duration</option>' +
    durations
      .map(
        (item) => `
          <option value="${item.minutes}">
            ${item.label}
          </option>
        `,
      )
      .join("");

  if (durations.some((item) => item.minutes === selectedMinutes)) {
    select.value = String(selectedMinutes);
  }

  return durations;
}

/* =========================================
   SELECT AVAILABLE SCHEDULE
   ========================================= */

function selectSlot(index) {
  const slot = booking.slots[index];

  if (!slot) return;

  booking.slot = slot;

  const slotStart = timeToMinutes(slot.start_time);
  const slotEnd = timeToMinutes(slot.end_time);

  const timeIn = getElement("booking-time-in");
  const timeOut = getElement("booking-time-out");

  const selectedWindow = getElement("booking-selected-window");

  selectedWindow.textContent = formatSchedule(slot);

  timeIn.min = minutesToInput(slotStart);
  timeIn.max = minutesToInput(slotEnd - 30);
  timeIn.value = minutesToInput(slotStart);

  timeOut.min = minutesToInput(slotStart + 30);
  timeOut.max = minutesToInput(slotEnd);
  timeOut.value = "";

  getElement("booking-details").classList.remove("hidden");

  const durations = setDurationOptions(slotEnd - slotStart, 30);

  if (durations.length === 0) {
    showBookingError("This available interval is shorter than 30 minutes.");

    getElement("booking-submit").disabled = true;
    return;
  }

  applyHours();
}

/* =========================================
   APPLY SELECTED DURATION
   ========================================= */

function applyHours() {
  if (!booking.slot) return;

  const slotStart = timeToMinutes(booking.slot.start_time);
  const slotEnd = timeToMinutes(booking.slot.end_time);

  const timeIn = getElement("booking-time-in");
  const timeOut = getElement("booking-time-out");
  const durationSelect = getElement("booking-hours");

  const requestedDuration = Number(durationSelect.value);

  if (
    !timeIn.value ||
    !BOOKING_DURATIONS.some((item) => item.minutes === requestedDuration)
  ) {
    timeOut.value = "";
    updatePreferred();
    return;
  }

  const start = timeToMinutes(timeIn.value);
  const remaining = slotEnd - start;

  if (start < slotStart || start >= slotEnd) {
    timeOut.value = "";
    updatePreferred();
    return;
  }

  const allowed = setDurationOptions(remaining, requestedDuration);

  let selected = allowed.find((item) => item.minutes === requestedDuration);

  if (!selected) {
    const shorterOptions = allowed.filter(
      (item) => item.minutes < requestedDuration,
    );

    selected = shorterOptions[shorterOptions.length - 1];
  }

  if (!selected) {
    timeOut.value = "";
    updatePreferred();
    return;
  }

  durationSelect.value = String(selected.minutes);

  timeOut.min = minutesToInput(start + 30);
  timeOut.max = minutesToInput(slotEnd);

  timeOut.value = minutesToInput(start + selected.minutes);

  updatePreferred();
}

function handleTimeInChange() {
  applyHours();
}

function handleTimeOutChange() {
  updatePreferred();
}

function resetBookingTimes() {
  if (!booking.slot) return;

  const slotStart = timeToMinutes(booking.slot.start_time);
  const slotEnd = timeToMinutes(booking.slot.end_time);

  getElement("booking-time-in").value = minutesToInput(slotStart);

  setDurationOptions(slotEnd - slotStart, 30);

  applyHours();
}

/* =========================================
   BOOKING VALIDATION
   ========================================= */

function showBookingError(message) {
  const error = getElement("booking-error");

  if (!error) return;

  error.textContent = message;
  error.classList.remove("hidden");
}

function updatePreferred() {
  const preferred = getElement("booking-preferred");
  const error = getElement("booking-error");
  const submit = getElement("booking-submit");

  if (!booking.slot || !preferred || !error || !submit) return;

  const slotStart = timeToMinutes(booking.slot.start_time);
  const slotEnd = timeToMinutes(booking.slot.end_time);

  const timeInValue = getElement("booking-time-in").value;
  const timeOutValue = getElement("booking-time-out").value;

  const durationSelect = getElement("booking-hours");

  let message = "";

  if (!timeInValue || !timeOutValue) {
    message = "Choose a duration and valid Time In and Time Out.";
  } else {
    const start = timeToMinutes(timeInValue);
    const end = timeToMinutes(timeOutValue);

    const duration = end - start;

    const matchingDuration = BOOKING_DURATIONS.find(
      (item) => item.minutes === duration,
    );

    const durationIsListed = Array.from(durationSelect.options).some(
      (option) => Number(option.value) === duration,
    );

    if (start < slotStart || end > slotEnd) {
      message = `Your booking must stay within ${formatSchedule(booking.slot)}.`;
    } else if (end <= start) {
      message = "Time Out must be later than Time In.";
    } else if (!matchingDuration || !durationIsListed) {
      message =
        "Choose one of the listed durations in 30-minute increments, up to 4 hours.";
    } else {
      durationSelect.value = String(duration);
    }
  }

  if (message) {
    error.textContent = message;
    error.classList.remove("hidden");

    preferred.textContent = "Please review your selected time";

    submit.disabled = true;
    return;
  }

  error.classList.add("hidden");
  error.textContent = "";

  const start = timeToMinutes(timeInValue);
  const end = timeToMinutes(timeOutValue);

  const durationLabel = BOOKING_DURATIONS.find(
    (item) => item.minutes === end - start,
  ).label;

  preferred.textContent = `${formatTime(timeInValue)} – ${formatTime(timeOutValue)} (${durationLabel})`;

  submit.disabled = false;
}

/* =========================================
   SUBMIT BOOKING
   ========================================= */

async function submitBooking() {
  if (!state.currentUser) {
    closeBookingModal();
    navigateTo("login-view");
    return;
  }

  if (!booking.room || !booking.slot) return;

  updatePreferred();

  const submit = getElement("booking-submit");

  if (submit.disabled) return;

  const timeIn = getElement("booking-time-in").value;
  const timeOut = getElement("booking-time-out").value;

  submit.disabled = true;
  submit.textContent = "Booking...";

  try {
    const response = await fetch("book_room.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        room_id: booking.room.id,
        start_time: timeIn,
        end_time: timeOut,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      alert(data.message || "Unable to book this room.");
      return;
    }

    const summary =
      `Room ${booking.room.room_number} (${booking.room.building_name}) · ` +
      `${formatTime(timeIn)} to ${formatTime(timeOut)}`;

    addHistory(`Booked ${summary}`);

    closeBookingModal();

    // Reload room and booking information after saving.
    await loadRooms();

    alert(
      `Booking saved!\n\n${summary}\n\nThe room directory has been updated with the remaining available time.`,
    );
  } catch (error) {
    console.error("Booking error:", error);

    alert("Unable to connect. Please try again.");
  } finally {
    submit.textContent = "Confirm Booking";

    if (booking.slot) {
      updatePreferred();
    }
  }
}

/* =========================================
   CLOSE BOOKING WINDOW WITH ESCAPE
   ========================================= */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeBookingModal();
  }
});
