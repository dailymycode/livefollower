const followersEl = document.getElementById("followers");
const statusEl = document.getElementById("status");
const updatedAtEl = document.getElementById("updatedAt");

const REFRESH_MS = 10000;

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTime(isoDate) {
  return new Date(isoDate).toLocaleTimeString("en-US");
}

async function refreshFollowers() {
  statusEl.textContent = "Refreshing...";
  statusEl.classList.remove("error");

  try {
    const response = await fetch("/api/followers");
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || "Could not fetch data.");
    }

    followersEl.textContent = formatNumber(payload.followers);
    statusEl.textContent = "Live";
    updatedAtEl.textContent = `Last update: ${formatTime(payload.updatedAt)}`;
  } catch (error) {
    statusEl.textContent = "Connection issue";
    statusEl.classList.add("error");
    updatedAtEl.textContent = "Retrying on next refresh...";
    console.error(error);
  }
}

refreshFollowers();
setInterval(refreshFollowers, REFRESH_MS);
