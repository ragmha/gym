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
- Run the app on an Android simulator: `yarn android`

## Directory Structure

```bash
workout-app/
├── readme.md
├── package.json
├── tsconfig.json
├── src
│   ├── __tests__
│   │   ├── App.test.tsx
│   ├── App.tsx
│   ├── components
│   │   └── Section.tsx
│   ├── navigation
│   │   ├── MainTabNavigator.tsx
│   │   ├── RootNavigator.tsx
│   │   ├── StackNavigator.tsx
│   │   └── types.ts
│   └── theme
│       ├── index.ts
│       ├── theme.ts
│       └── types.ts
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT © [Raghib Hasan](https://raghibhasan.com/)
