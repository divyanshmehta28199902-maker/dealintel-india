🔒 Security Policy

<div align="center">

DealIntel India Security Policy

Protecting Business Data, Financial Information & User Privacy

</div>

⸻

Security Commitment

Security is a core principle of DealIntel India.

As a platform handling confidential business information, financial statements, valuations, and acquisition opportunities, we are committed to protecting user data and continuously improving the security of our application.

We appreciate responsible disclosure from the security community.

⸻

Supported Versions

The following table indicates which versions currently receive security updates.

Version	Supported
Latest Beta	✅
Previous Beta	⚠️ Limited
Older Releases	❌

Always use the latest available version.

⸻

Reporting a Security Vulnerability

Please do not report security vulnerabilities through public GitHub Issues or Discussions.

Instead, report vulnerabilities privately.

Include as much information as possible:

* Vulnerability description
* Steps to reproduce
* Potential impact
* Screenshots (if applicable)
* Proof of Concept (if available)

⸻

Response Process

When a valid security report is received, we aim to:

Stage	Target
Acknowledge report	Within 72 hours
Initial assessment	Within 7 days
Develop a fix	As soon as practical
Release security update	Based on severity

These are goals rather than guaranteed response times.

⸻

Scope

Security reports are welcome for issues affecting the DealIntel application, including:

* Authentication
* Authorization
* Session Management
* Business Data Exposure
* API Security
* Database Security
* File Uploads
* Document Storage
* Payment Integration (when implemented)
* Role-Based Access Control
* Sensitive Information Disclosure
* Cross-Site Scripting (XSS)
* SQL Injection
* Remote Code Execution
* Server Misconfiguration
* Dependency Vulnerabilities

⸻

Out of Scope

The following generally fall outside this policy:

* Social engineering
* Physical attacks
* Denial-of-service testing against production
* Spam
* Issues requiring physical device access
* Vulnerabilities in unsupported third-party software
* Reports without sufficient detail to reproduce

⸻

Security Features

DealIntel is designed with multiple layers of security, including:

Authentication

* Secure user authentication
* Password hashing
* Session protection
* JWT-based authentication (where applicable)

⸻

Authorization

* Role-Based Access Control (RBAC)
* Protected routes
* Permission checks
* Access restrictions by user role

⸻

Data Protection

* Encrypted connections (HTTPS)
* Sensitive configuration stored outside source control
* Secure handling of uploaded documents
* Database access controls

⸻

Application Security

* Input validation
* Output encoding
* Server-side validation
* Error handling without exposing sensitive details
* Dependency updates

⸻

Responsible Disclosure Guidelines

Please:

* Give us a reasonable opportunity to investigate and fix the issue before public disclosure.
* Avoid accessing data that does not belong to you.
* Avoid modifying or deleting data.
* Avoid disrupting the availability of the service.
* Report vulnerabilities in good faith.

⸻

Third-Party Dependencies

DealIntel relies on third-party libraries and services.

We periodically:

* Review dependencies
* Apply security updates
* Remove vulnerable packages when practical

⸻

Secrets & Credentials

The repository should never contain:

* API keys
* Passwords
* Database credentials
* Access tokens
* Private certificates
* .env files
* Cloud provider secrets

Contributors must ensure secrets are excluded before committing code.

⸻

Security Best Practices for Contributors

Before submitting a Pull Request:

* Run dependency vulnerability checks.
* Avoid introducing unnecessary dependencies.
* Validate user input.
* Sanitize uploaded data.
* Follow the project’s coding standards.
* Remove debugging code before submission.

⸻

Security Updates

Important security fixes will be documented in:

* CHANGELOG.md
* Release notes (when applicable)

⸻

Contact

For security-related concerns, contact the project maintainer privately through GitHub or the project’s official contact channel.

Do not disclose sensitive vulnerability details publicly until they have been reviewed.

⸻

Disclaimer

While we strive to maintain a secure platform, no software can be guaranteed to be completely free of vulnerabilities.

Users should keep their deployments updated and follow standard security best practices.

⸻

<div align="center">

🛡️ Security is a shared responsibility.

Thank you for helping keep DealIntel India secure.

</div>
