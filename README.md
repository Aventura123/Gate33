# Gate33

Gate33 is a next-generation Web3 job and micro-task platform, featuring company dashboards, instant jobs, Learn2Earn campaigns, and blockchain-based payments.

## Features

- Company dashboard for job posting and management
- Instant Jobs (micro-tasks) with escrow and messaging
- Learn2Earn campaign creation and management
- Web3 wallet integration and smart contract payments
- Admin panel for platform management
- Built with Next.js, React, TypeScript, Firebase, and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js v20+
- npm or yarn
- Firebase project (for Firestore and Auth)
- (Optional) MetaMask or compatible Web3 wallet

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/gate33-newage.git
   cd gate33-newage
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env.local` and fill in your Firebase and other required keys.

4. Set up Firebase:
   - Create Firestore collections: `companies`, `jobs`, `jobPlans`, `instantJobs`, `learn2earn`, etc.
   - Set up authentication providers as needed.

5. (Optional) Deploy smart contracts in `/contracts` and update addresses in `config/tokenConfig.ts`.

### Running the Project

To start the development server:
```bash
npm run dev
# or
yarn dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

### Deployment (Vercel)

1. Go to [https://vercel.com/](https://vercel.com/) and log in or sign up.
2. Import your repository.
3. Set the environment variables in the Vercel dashboard (use `.env.local` as reference).
4. Click "Deploy".
5. After deployment, your site will be live at the provided Vercel URL.

For custom domains, follow Vercel's documentation to add and configure your domain.

## Project Structure

- `/app` - Next.js app directory (pages, API routes, dashboards)
- `/components` - Reusable React components
- `/services` - Business logic and API integrations
- `/contracts` - Solidity smart contracts
- `/lib` - Firebase and utility libraries
- `/types` - TypeScript types
- `/public` - Static assets

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to your branch and open a pull request

## License

This project is licensed under the MIT License.