import { supabase } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

export async function fetchAlbums() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("user_id", user.id);
  return data || [];
}

export async function addAlbum(album) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("[DEBUG] addAlbum: No user logged in");
    return { error: "No user" };
  }
  // Remove root-level onTheWay property if present
  const { onTheWay, ...albumToSave } = album;
  const { data, error } = await supabase
    .from("albums")
    .insert([{ ...albumToSave, user_id: user.id }]);
  if (error) {
    console.error("[DEBUG] addAlbum: Supabase error", error);
    return { error };
  }
  console.log("[DEBUG] addAlbum: Supabase insert data", data);
  return { data };
}

export async function updateAlbum(id, album) {
  const user = await getCurrentUser();
  if (!user) return { error: "No user" };
  // Remove root-level onTheWay property if present
  const { onTheWay, ...albumToSave } = album;
  const { data, error } = await supabase
    .from("albums")
    .update(albumToSave)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[DEBUG] updateAlbum: Supabase error", error);
    return { error };
  }
  return { data };
}

export async function deleteAlbum(id) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from("albums").delete().eq("id", id).eq("user_id", user.id);
}

const sortableElement = document.querySelector('.appheader');

function insertAfter(referenceNode, newNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function createAndInsertDiv(className, referenceNode) {
  var newDiv = document.createElement("div");
  newDiv.classList.add(className);
  referenceNode.appendChild(newDiv);
  return newDiv;
}

if (sortableElement) {
  // Create the parent div 'headerInfos'
  var headerInfos = document.createElement('div');
  headerInfos.classList.add('headerInfos');
  insertAfter(sortableElement, headerInfos);

  // Create the div 'divDate' inside 'headerInfos'
  var divDate = createAndInsertDiv('divDate', headerInfos);

  // Create <div> elements for date and time inside 'divDate'
  var timeDiv = createAndInsertDiv('clock', divDate);
  var dateDiv = createAndInsertDiv('thedate', divDate);

  // Create the div 'weather' inside 'headerInfos'
  var weatherDiv = createAndInsertDiv('weather', headerInfos);

  function showDateTime() {
    const now = new Date();

    const dayOptions = {
      weekday: 'long'
    };

    const timeOptions = {
      hour: 'numeric',
      minute: 'numeric'
    };

    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    const formattedDay = now.toLocaleDateString(undefined, dayOptions);
    const formattedDate = now.toLocaleDateString(undefined, dateOptions);
    const formattedTime = now.toLocaleTimeString(undefined, timeOptions);

    // Clear the content to avoid accumulation
    dateDiv.innerHTML = '';

    // Insert the day of the week in a <span> inside '.thedate'
    var spanDayOfWeek = document.createElement('span');
    spanDayOfWeek.textContent = formattedDay;
    dateDiv.appendChild(spanDayOfWeek);

    // Insert the time (without seconds) in '.clock'
    timeDiv.textContent = formattedTime;

    // Insert the rest of the date outside the <span>
    dateDiv.appendChild(document.createTextNode(formattedDate));
  }

  // Get the user's geolocation (example here with a static value)
  const latitude = 45.783; // City latitude (example for Paris)
  const longitude = 3.083; // City longitude (example for Paris)

  // Initial call to display date, time, and weather
  showDateTime();
  // showWeather(latitude, longitude); // Uncomment and implement if you have a weather function

  // Update the time every second
  setInterval(showDateTime, 1000);
}
function arrangeCircle(selector, radius = 150) {
  const items = document.querySelectorAll(selector);
  const count = items.length;
  if (count === 0) return;

  const parent = items[0].parentElement;
  parent.style.position = "relative";
  const centerX = parent.offsetWidth / 2;
  const centerY = parent.offsetHeight / 2;

  items.forEach((item, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle) - item.offsetWidth / 2;
    const y = centerY + radius * Math.sin(angle) - item.offsetHeight / 2;
    item.style.position = "absolute";
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
  });
}

// Usage: run after DOM is ready
window.addEventListener("DOMContentLoaded", function() {
  arrangeCircle('.item-container.tag-0-dash', 150); // 150px radius, adjust as needed
});
