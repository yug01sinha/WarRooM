const handleAsk = async () => {
if (!question.trim() || !activeDoc) return;

const newMsgs = [...messages, { role: 'user', content: question }];
setMessages(newMsgs);
setQuestion("");

try {
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY,
},
body: JSON.stringify({
model: "llama3-70b-8192",
messages: [
{
role: "system",
content: "Use this document: " + activeDoc.extracted_text
},
...newMsgs
]
})
});


const data = await res.json();
setMessages(prev => [...prev, {
  role: 'assistant',
  content: data.choices[0].message.content
}]);


} catch {
toast.error("AI failed");
}
};
function Notes() {
  // your code (including handleAsk)
}

export default Notes;