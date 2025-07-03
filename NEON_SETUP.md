# Neon Database Setup Guide

This guide will help you set up a Neon PostgreSQL database for the Mini Inventory System.

## 🚀 Quick Setup

### 1. Create Neon Account
1. Go to [console.neon.tech](https://console.neon.tech)
2. Click "Sign Up" and create a free account
3. Verify your email address

### 2. Create Project
1. Click "Create Project"
2. Choose a project name (e.g., "mini-inventory")
3. Select a region close to you
4. Click "Create Project"

### 3. Get Connection String
1. In your project dashboard, click "Connection Details"
2. Copy the connection string that looks like:
   ```
   postgresql://[user]:[password]@[endpoint]/[dbname]?sslmode=require
   ```

### 4. Configure Environment
1. Copy `env.example` to `.env`
2. Update your `.env` file:
   ```env
   DB_TYPE=postgres
   DATABASE_URL=<neon_connection_string>
   ```
3. Replace the placeholder with your actual Neon connection string

### 5. Run Migrations
```bash
pipenv run alembic upgrade head
```

## 🔧 Alternative Setup Methods

### Method 1: Using Setup Script
```bash
python setup.py
```
This interactive script will guide you through the setup process.

### Method 2: Manual Setup
1. Create `.env` file manually
2. Add your Neon connection string
3. Run migrations

## 📊 Neon Dashboard Features

### Connection Details
- **Host**: Your database endpoint
- **Database**: Usually "neondb" or your project name
- **Port**: 5432 (PostgreSQL default)
- **User**: Your database username
- **Password**: Your database password

### SQL Editor
- Use Neon's built-in SQL editor to run queries
- Perfect for debugging and data inspection

### Monitoring
- Monitor database performance
- View connection statistics
- Check resource usage

## 🔒 Security Best Practices

### Environment Variables
- Never commit `.env` files to git
- Use different databases for development and production
- Rotate passwords regularly

### Connection Security
- Always use SSL connections (`?sslmode=require`)
- Use connection pooling for production
- Limit database access to your application

## 🚨 Troubleshooting

### Connection Issues
```bash
# Test connection
pipenv run python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('DATABASE_URL:', os.getenv('DATABASE_URL'))
"
```

### Migration Issues
```bash
# Check migration status
pipenv run alembic current

# Reset migrations (if needed)
pipenv run alembic downgrade base
pipenv run alembic upgrade head
```

### Common Errors

#### "could not translate host name"
- Check your internet connection
- Verify the endpoint URL is correct
- Try using a different DNS server

#### "authentication failed"
- Verify username and password
- Check if your IP is whitelisted (if applicable)
- Ensure the database exists

#### "database does not exist"
- Create the database in Neon dashboard
- Check the database name in your connection string

## 📈 Neon Free Tier Limits

- **Storage**: 3GB
- **Compute**: 0.5 CPU, 1GB RAM
- **Connections**: 100 concurrent connections
- **Projects**: Unlimited projects

Perfect for development and small production applications!

## 🔄 Switching Between Databases

### Development (SQLite)
```env
DB_TYPE=sqlite
DATABASE_URL=sqlite:///./test.db
```

### Production (Neon)
```env
DB_TYPE=postgres
DATABASE_URL=postgresql+psycopg2://[user]:[password]@[endpoint]/[dbname]?sslmode=require
```

## 📞 Support

- **Neon Documentation**: [neon.tech/docs](https://neon.tech/docs)
- **Neon Community**: [discord.gg/neondatabase](https://discord.gg/neondatabase)
- **Project Issues**: Create an issue in this repository

## 🎯 Next Steps

After setting up Neon:

1. **Test the connection**: Run migrations successfully
2. **Start development**: `pipenv run uvicorn api.main:app --reload --port 9000`
3. **Deploy to Vercel**: Add your `DATABASE_URL` to Vercel environment variables
4. **Monitor usage**: Check Neon dashboard for performance metrics

Happy coding! 🚀