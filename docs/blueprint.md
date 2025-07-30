# **App Name**: CharaForge AI

## Core Features:

- User Authentication: User authentication using Firebase Authentication with email/password and Google sign-in.
- Modular Character Creation: Dynamic character creation UI based on DataPacks (schemas in Firestore/Cloud Storage).
- AI Text Generation: AI-powered generation of character names and biographies using Gemini models. Uses a tool for inserting personalized data, so each user gets unique output.
- AI Image Generation: AI-driven character image generation (general with Gemini, high-quality/styled with Imagen). Includes text-to-image and image editing (Gemini only for image input). Uses a tool for conditional use of different AI tools.
- Character Vault: Private gallery for users to manage their created characters (Firestore data).
- Public Gallery: Public gallery to showcase characters shared by users, sorted by popularity (likes, Firestore data).
- DataPack Access Validation: Access validation on backend (tRPC/Genkit) for DataPacks; checks if pack is installed and user has permissions, for data integrity.

## Style Guidelines:

- Primary color: Soft sky blue (#87CEEB) evoking serenity and openness.
- Background color: Light gray (#F0F0F0), a muted version of the primary, for a calm and neutral backdrop.
- Accent color: Pale violet (#D8BFD8), a soft color to complement the primary while providing visual interest to elements such as buttons.
- Headline font: 'Playfair', serif, for a fashionable and high-end feel in headings.
- Body font: 'PT Sans', sans-serif, matching with Playfair for body text.
- Clean, minimalist icons to represent character attributes and categories.
- Modern, responsive layout that adapts seamlessly to different screen sizes.
- Subtle animations for character creation and transitions.