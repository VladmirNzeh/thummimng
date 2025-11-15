const API_URL = "http://localhost:8080/query";
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const question = userInput.value.trim();
  if (!question) return;

  addMessage(question, "user");
  userInput.value = "";
  addMessage("Thinking...", "bot");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question })
    });
    const data = await res.json();
    chatBox.lastChild.remove();
    addMessage(data.answer || "No response received.", "bot");
  } catch (err) {
    chatBox.lastChild.remove();
    addMessage("Error connecting to backend.", "bot");
    console.error(err);
  }
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});
