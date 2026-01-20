# DWG to PDF Converter

A professional-grade web application for converting DWG and DXF CAD files to PDF format. Built with a modern tech stack featuring React, Node.js, Python, and Stripe payment integration.

## Features

### Core Functionality
- **DWG/DXF to PDF Conversion**: Upload CAD files and receive high-quality PDF outputs
- **Asynchronous Processing**: Queue-based conversion system with Celery and Redis
- **Secure File Storage**: S3 integration for uploaded files and generated PDFs
- **Real-time Status Updates**: Track conversion progress with live status indicators

### User Management
- **Authentication**: Manus OAuth integration for secure login
- **Two-Tier System**: 
  - **Free Tier**: 5 conversions per month with standard processing
  - **Premium Tier**: Unlimited conversions with priority queue processing
- **Usage Tracking**: Automatic monthly usage monitoring and limit enforcement

### Payment Integration
- **Stripe Checkout**: Seamless subscription upgrade flow
- **Webhook Handling**: Automatic tier upgrades and subscription management
- **Test Mode**: Full testing support with Stripe test cards

### Admin Panel
- **User Management**: View and manage user accounts, assign roles
- **Conversion Monitoring**: Track all conversions with detailed status information
- **Analytics Dashboard**: Performance metrics, processing times, and system health
- **System Statistics**: Real-time queue status and success rates

### Design
- **CAD-Inspired Theme**: Deep royal blue background with technical grid pattern
- **Professional UI**: Clean, modern interface built with shadcn/ui components
- **Responsive Design**: Fully responsive across desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **tRPC** for type-safe API calls
- **Wouter** for routing
- **shadcn/ui** component library

### Backend
- **Node.js** with Express
- **Python 3.11** for DWG conversion service
- **Flask** API server for Python integration
- **Celery** with Redis for task queue
- **MySQL/TiDB** database with Drizzle ORM
- **Stripe** for payment processing
- **S3** for file storage

### Conversion Engine
- **ezdxf** library for DXF parsing
- **matplotlib** for PDF rendering
- **Celery** for async task processing
- **Redis** for queue management

## Project Structure

```
dwg-pdf-converter/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── pages/            # Page components (Home, Dashboard, Admin, Upgrade)
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # tRPC client configuration
│   │   └── index.css         # Global styles with CAD theme
│   └── public/               # Static assets
├── server/                    # Backend Node.js application
│   ├── _core/                # Core framework files
│   ├── db.ts                 # Database queries and helpers
│   ├── routers.ts            # tRPC procedures
│   ├── pythonClient.ts       # Python service integration
│   ├── stripeWebhook.ts      # Stripe webhook handler
│   └── *.test.ts             # Vitest test files
├── python_service/            # Python conversion service
│   ├── converter.py          # DWG/DXF conversion logic
│   ├── celery_app.py         # Celery task definitions
│   ├── api_server.py         # Flask API server
│   └── start_services.sh     # Service startup script
├── drizzle/                   # Database schema and migrations
│   └── schema.ts             # Table definitions
└── todo.md                    # Project tracking file
```

## Database Schema

### Tables
- **users**: User accounts with subscription information
- **conversions**: Conversion history and status tracking
- **usage_tracking**: Monthly usage limits enforcement
- **analytics_events**: Conversion analytics and metrics
- **email_queue**: Email notification queue (for future implementation)

## API Endpoints

### tRPC Procedures

**Authentication**
- `auth.me` - Get current user
- `auth.logout` - Logout user

**Conversions**
- `conversion.upload` - Upload DWG/DXF file for conversion
- `conversion.getHistory` - Get user's conversion history
- `conversion.getStatus` - Get conversion status by ID
- `conversion.getUsage` - Get current month usage

**Subscriptions**
- `subscription.getCurrent` - Get current subscription info
- `subscription.createCheckout` - Create Stripe checkout session

**Admin** (Admin role required)
- `admin.getUsers` - Get all users
- `admin.getConversions` - Get all conversions
- `admin.getStats` - Get system statistics
- `admin.getAnalytics` - Get analytics data
- `admin.updateUserRole` - Update user role

### Python Service API
- `POST /convert` - Start DWG/DXF conversion
- `GET /status/<task_id>` - Get conversion task status
- `GET /health` - Service health check

### Stripe Webhooks
- `POST /api/stripe/webhook` - Handle Stripe events

## Setup and Installation

### Prerequisites
- Node.js 22+
- Python 3.11+
- Redis server
- MySQL/TiDB database

### Environment Variables
System environment variables are automatically configured:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Session cookie signing secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (frontend)

### Installation

1. Install Node.js dependencies:
```bash
pnpm install
```

2. Install Python dependencies:
```bash
sudo pip3 install ezdxf celery redis pillow reportlab flask matplotlib
```

3. Push database schema:
```bash
pnpm db:push
```

4. Start Python conversion services:
```bash
cd python_service
./start_services.sh
```

5. Start development server:
```bash
pnpm dev
```

## Testing

Run the test suite:
```bash
pnpm test
```

Test coverage includes:
- Authentication flows
- Conversion upload and validation
- Subscription tier enforcement
- Stripe checkout integration
- Admin procedures and authorization

## Stripe Integration

### Test Mode
Use test card: `4242 4242 4242 4242`
- Any future expiration date
- Any 3-digit CVC
- Any ZIP code

### Webhook Testing
Test events automatically return verification response for Stripe CLI testing.

### Production Setup
1. Claim Stripe sandbox at provided URL
2. Complete KYC verification
3. Update live keys in Settings → Payment
4. Use 99% discount promo code for live testing (minimum $0.50 USD)

## Usage Limits

### Free Tier
- 5 conversions per month
- Standard queue processing
- Secure file storage
- Email notifications

### Premium Tier ($29/month)
- Unlimited conversions
- Priority queue processing
- Batch file uploads
- Extended file storage
- Priority support

## File Specifications

### Supported Formats
- DWG (AutoCAD Drawing)
- DXF (Drawing Exchange Format)

### Limitations
- Maximum file size: 100MB
- Supported conversion: DWG/DXF → PDF

## Admin Access

Admin users can access the admin panel at `/admin` to:
- View and manage all users
- Monitor conversion activity
- Track system performance
- Analyze usage patterns
- Update user roles

The project owner is automatically assigned admin role based on `OWNER_OPEN_ID` environment variable.

## Conversion Flow

1. **Upload**: User uploads DWG/DXF file through web interface
2. **Validation**: File type and size validation, usage limit check
3. **Storage**: File uploaded to S3 with unique key
4. **Queue**: Conversion task added to Celery queue (priority for Premium users)
5. **Processing**: Python worker processes file using ezdxf and matplotlib
6. **Storage**: Generated PDF uploaded to S3
7. **Notification**: Database updated with completion status
8. **Download**: User can download PDF from dashboard

## Security Features

- OAuth authentication with Manus
- JWT session management
- Role-based access control (user/admin)
- Stripe webhook signature verification
- S3 secure file storage
- Environment variable protection
- Input validation and sanitization

## Performance Optimization

- Asynchronous task processing with Celery
- Redis-backed task queue
- Priority queue for Premium users
- Database indexing on frequently queried fields
- S3 CDN for file delivery
- Efficient database queries with Drizzle ORM

## Future Enhancements

Planned features (see todo.md):
- Email notification system for conversion completion
- Batch upload interface for multiple files
- Queue visualization for pending conversions
- Additional CAD format support
- Advanced analytics and reporting
- API access for programmatic conversions

## License

MIT License

## Support

For technical support or feature requests, please contact the development team.

---

**Built with precision for architects, engineers, and designers.**
