# FRED Economic Indicators Dashboard

A Next.js application that displays key economic indicators from the Federal Reserve Economic Data (FRED) system, built from a Figma mockup using the Recharts library.

## Features

- **Real-time Economic Data**: Connects to the FRED API to fetch live economic data
- **Interactive Charts**: Visualizes data using Recharts library with interactive tooltips and legends
- **Responsive Design**: Fully responsive layout matching the Figma mockup
- **Navigation Sidebar**: Easy navigation between different economic indicator categories

## Economic Indicators

### Key Indicators (Implemented)
- **CPI (Consumer Price Index)** - Last five years trend
- **Unemployment Rate** - Infra-annual labor statistics
- **10-Year Treasury Yields** - Long-term government bond yields
- **3-Month Treasury Rates** - Short-term rates and yields

### Categories (Coming Soon)
- Inflation
- Employment
- Interest Rates
- Economic Growth
- Exchange Rates
- Housing
- Consumer Spending

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A FRED API key (free from [https://fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html))

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your FRED API key:
   - Open `.env.local`
   - Replace `your_fred_api_key_here` with your actual FRED API key:
     ```
     NEXT_PUBLIC_FRED_API_KEY=your_actual_api_key_here
     ```

### Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

### Building for Production

```bash
npm run build
npm start
```

## FRED API Configuration

### Getting Your API Key

1. Visit [https://fred.stlouisfed.org/](https://fred.stlouisfed.org/)
2. Create a free account
3. Request an API key at [https://fredaccount.stlouisfed.org/apikeys](https://fredaccount.stlouisfed.org/apikeys)
4. Add your API key to `.env.local`

### Fallback Data

The application includes sample data that will be used if:
- No API key is configured
- The API key is invalid
- The FRED API is unavailable

This ensures the application always displays data for demonstration purposes.

## FRED Series Used

- **CPIAUCSL**: Consumer Price Index for All Urban Consumers
- **UNRATE**: Unemployment Rate
- **GS10**: 10-Year Treasury Constant Maturity Rate
- **TB3MS**: 3-Month Treasury Bill Secondary Market Rate

## Technology Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Recharts** - Charting library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **FRED API** - Economic data source

## Project Structure

```
fed-data/
├── app/
│   ├── components/
│   │   └── Sidebar.tsx         # Navigation sidebar component
│   ├── lib/
│   │   └── fredApi.ts          # FRED API integration
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main dashboard page
│   └── globals.css             # Global styles
├── .env.local                  # Environment variables (API key)
└── package.json
```

## Design

Built from a Figma mockup with:
- Clean, professional layout
- Gray backgrounds (#D9D9D9) for chart containers
- White chart areas for optimal data visibility
- Blue accent color for active navigation items
- Responsive grid layout (2x2 on desktop, stacked on mobile)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Credits

- Economic data provided by Federal Reserve Economic Data (FRED)
- Charts built with Recharts
- Design based on Figma mockup
