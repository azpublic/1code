/**
 * Test script to verify z.ai API works for:
 * 1. Chat name generation
 * 2. Commit message generation
 *
 * Run with: node test-zai-api.js YOUR_ZAI_API_KEY
 */

const API_KEY =  process.argv[2];
// const BASE_URL = "https://api.z.ai/api/paas/v4";
const BASE_URL = "https://api.z.ai/api/coding/paas/v4";

async function testChatNameGeneration() {
  console.log("\n=== Test 1: Chat Name Generation ===");

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "glm-4.7",
      messages: [
        {
          role: "user",
          content: 'Generate a very short (2-5 words) title for a chat about: "Create an about page for our international audience with modern interactive features showcasing our team in great detail." Only output the title, nothing else.',
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    console.error("❌ Chat name generation failed:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  console.log("raw data : ", JSON.stringify(data));
  const choice = data.choices[0];
  const message = choice?.message || {};
  const chatName = (message.content || message.reasoning_content || "")?.trim();
  console.log("✅ Generated chat name:", chatName);
  console.log("   finish_reason:", choice?.finish_reason);
  return chatName;
}

async function testCommitMessageGeneration() {
  console.log("\n=== Test 2: Commit Message Generation ===");

  const diff = `diff --git a/src/components/AboutPage.tsx b/src/components/AboutPage.tsx
index 1234567..89abcde 100644
--- a/src/components/AboutPage.tsx
+++ b/src/components/AboutPage.tsx
@@ -1,3 +1,5 @@
 import React from 'react';
+import { TeamSection } from './TeamSection';
+import { ContactSection } from './ContactSection';
+import { InteractiveShowcase } from './InteractiveShowcase';

 const AboutPage: React.FC = () => {
   return (
     <div className="about-page">
       <h1>About Us</h1>
+      <TeamSection />
+      <InteractiveShowcase />
     </div>
   );
 };
`;

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "glm-4.7",
      messages: [
        {
          role: "user",
          content: `Generate a conventional commit message for these changes. Use format: type: short description. Types: feat (new feature), fix (bug fix), docs, style, refactor, test, chore. Only output the commit message, nothing else.

${diff}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    console.error("❌ Commit message generation failed:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  console.log("raw data : ", JSON.stringify(data));
  const choice = data.choices[0];
  const message = choice?.message || {};
  const commitMessage = (message.content || message.reasoning_content || "")?.trim();
  console.log("✅ Generated commit message:", commitMessage);
  console.log("   finish_reason:", choice?.finish_reason);
  return commitMessage;
}

async function main() {
  if (!API_KEY) {
    console.error("❌ Please provide Z.AI API key as argument:");
    console.error("node test-zai-api.js YOUR_ZAI_API_KEY");
    process.exit(1);
  }

  console.log("Testing Z.AI API for APP TASKS (chat names and commit messages)...");
  console.log("API Endpoint:", BASE_URL);
  console.log("Model: glm-4.7");

  try {
    const chatName = await testChatNameGeneration();
    const commitMessage = await testCommitMessageGeneration();

    console.log("chatName" , chatName);
    console.log("commitMessage" , commitMessage);


    if (chatName && commitMessage) {
      console.log("\n✅ All tests passed!");
      console.log("\nYou can now proceed with implementing the multi-model configuration system.");
    } else {
      console.log("\n❌ Some tests failed. Please check your API key and try again.");
    }
  } catch (error) {
    console.error("\n❌ Error during testing:", error.message);
  }
}

main();
