const OpenAI = require("openai");
const dotenv = require("dotenv");
const readlineSync = require("readline-sync");

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Load API key from .env
});

async function getWeatherDetails(city) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );
    const data = await response.json();
    //console.log(data);
    if (data.cod !== 200) throw new Error(data.message);
    return {
      temperature: data.main.temp,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

const SYSTEM_PROMPT = `
You are an AI Assistant with a structured approach: START, PLAN, ACTION, OBSERVATION, and OUTPUT.

Wait for the user prompt, then:
1. PLAN using available tools.
2. Take ACTION using the tools.
3. Observe results and return the AI response.

Available Tool:
- getWeatherDetails(city: string): Fetches the current weather details for a city, including temperature, description, humidity, and wind speed.

Format your JSON output strictly as in the example below:

Example:
START
{ "type": "user", "user": "What is the weather like in Bengaluru?" }
{ "type": "plan", "plan": "I will call getWeatherDetails for Bengaluru" }
{ "type": "action", "function": "getWeatherDetails", "input": "Bengaluru" }
{ "type": "observation", "observation": { "temperature": "29.54°C", "description": "few clouds", "humidity": "23%", "windSpeed": "5.53 m/s" } }
{ "type": "output", "output": "The weather in Bengaluru is currently 29.54°C with few clouds. Humidity is at 23% and the wind speed is 5.53 m/s." }
`;

const messages = [{ role: "system", content: SYSTEM_PROMPT }];

async function main() {
  while (true) {
    const query = readlineSync.question(">> ");
    messages.push({
      role: "user",
      content: JSON.stringify({ type: "user", user: query }),
    });

    while (true) {
      const chatResponse = await client.chat.completions.create({
        messages: messages,
        model: "gpt-4o",
        response_format: { type: "json_object" },
      });

      const result = chatResponse.choices[0].message.content;
      messages.push({ role: "system", content: result });
      console.log("---------AI_---------");
      console.log(result);
      console.log("---------AI_end---------");

      try {
        const call = JSON.parse(result);
        if (call.type === "output") {
          console.log(call.output);
          break;
        } else if (
          call.type === "action" &&
          call.function === "getWeatherDetails"
        ) {
          const city = call.input;
          const weather = await getWeatherDetails(city);
          if (weather !== null) {
            messages.push({
              role: "system",
              content: JSON.stringify({
                type: "observation",
                observation: weather,
              }),
            });
          } else {
            console.log("Failed to fetch weather.");
            break;
          }
        }
      } catch (error) {
        console.error("Error parsing JSON response:", error);
        break;
      }
    }
  }
}

main();
