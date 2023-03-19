# Gym

This is a React Native app for tracking workouts.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- yarn package manager
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository: `git clone https://github.com/your-username/workout-app.git`
2. Install dependencies: `yarn install`
3. For iOS, install CocoaPods: `cd ios && pod install && cd ..`

### Usage

- Run the app on an iOS simulator: `yarn ios`
- Run the app on an Android simulator: `npm run android` or `yarn android`

## Directory Structure

```bash
workout-app/
├── App.tsx
├── src/
│   ├── assets/
│   │   ├── fonts/
│   │   ├── images/
│   │   └── videos/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.test.tsx
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   └── Header.test.tsx
│   ├── hooks/
│   │   └── useWorkout.ts
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   ├── screens/
│   │   ├── Home/
│   │   │   ├── HomeScreen.tsx
│   │   │   └── WorkoutDetailScreen.tsx
│   │   └── Workout/
│   │       ├── WorkoutScreen.tsx
│   │       └── CreateWorkoutScreen.tsx
│   ├── utils/
│   │   ├── api.ts
│   │   ├── validators.ts
│   │   └── theme.ts
│   ├── App.tsx
│   └── index.tsx
├── __tests__/
│   ├── App.test.tsx
│   └── setupTests.ts
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── package.json
├── README.md
├── tsconfig.json
└── yarn.lock
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT © [Raghib Hasan](https://raghibhasan.com/)
