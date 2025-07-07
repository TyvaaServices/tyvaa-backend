import puppeteer from "puppeteer";
import { writeFile } from "fs/promises";
import createLogger from "./logger.js";

const logger = createLogger("pdf-generator");

/**
 * Professional PDF Generator for Tyvaa Corporation
 * A comprehensive solution for generating beautiful, branded documents
 */
class TyvaaPDFGenerator {
    /**
     * @param {Object} [options]
     * @param {Object} [options.logger] - Optional logger instance (for testing/mocking)
     */
    constructor(options = {}) {
        this.logger = options.logger || logger;
        this.brandColors = {
            primary: "#6a0dad",
            secondary: "#4a0a8a",
            accent: "#8a2be2",
            gradient: "linear-gradient(135deg, #6a0dad 0%, #4a0a8a 100%)",
            text: "#2c3e50",
            lightText: "#7f8c8d",
            background: "#f8f9fa",
            white: "#ffffff",
            success: "#27ae60",
            warning: "#f39c12",
            error: "#e74c3c",
        };

        this.fonts = {
            primary: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            heading: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
            mono: '"Courier New", Courier, monospace',
        };
    }

    /**
     * Generate comprehensive company report PDF
     * @param {Object} data - Data for the report
     * @param {Object} [data.stats] - Statistics for the report
     * @param {string|number} [data.stats.totalRides] - Total number of rides
     * @param {string|number} [data.stats.activeDrivers] - Number of active drivers
     * @param {string|number} [data.stats.totalUsers] - Number of active users
     * @param {string|number} [data.stats.revenue] - Revenue (e.g., '2.5M')
     * @returns {Promise<Buffer>} PDF buffer
     */
    async generateCompanyReport(data = {}) {
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true,
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1200, height: 800 });

            const htmlContent = this.getCompanyReportHTML(data);
            await page.setContent(htmlContent, { waitUntil: "networkidle0" });

            const pdf = await page.pdf({
                format: "A4",
                printBackground: true,
                margin: {
                    top: "20mm",
                    right: "15mm",
                    bottom: "20mm",
                    left: "15mm",
                },
                displayHeaderFooter: true,
                headerTemplate: this.getHeaderTemplate(),
                footerTemplate: this.getFooterTemplate(),
            });

            this.logger.info("Company report PDF generated successfully");
            return pdf;
        } catch (error) {
            this.logger.error("Error generating company report PDF:", error);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * Generate driver application PDF
     * @param {Object} driverData - Driver application data
     * @param {string} [driverData.fullName]
     * @param {string} [driverData.birthDate]
     * @param {string} [driverData.phone]
     * @param {string} [driverData.email]
     * @param {string} [driverData.address]
     * @param {string|number} [driverData.experience]
     * @param {string} [driverData.licenseType]
     * @param {string} [driverData.vehicle]
     * @param {string} [driverData.licenseStatus] - status-approved | status-pending | status-rejected
     * @param {string} [driverData.idStatus] - status-approved | status-pending | status-rejected
     * @param {string} [driverData.insuranceStatus] - status-approved | status-pending | status-rejected
     * @param {string} [driverData.criminalRecordStatus] - status-approved | status-pending | status-rejected
     * @returns {Promise<Buffer>} PDF buffer
     */
    async generateDriverApplication(driverData = {}) {
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true,
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1200, height: 800 });

            const htmlContent = this.getDriverApplicationHTML(driverData);
            await page.setContent(htmlContent, { waitUntil: "networkidle0" });

            const pdf = await page.pdf({
                format: "A4",
                printBackground: true,
                margin: {
                    top: "20mm",
                    right: "15mm",
                    bottom: "20mm",
                    left: "15mm",
                },
                displayHeaderFooter: true,
                headerTemplate: this.getHeaderTemplate(),
                footerTemplate: this.getFooterTemplate(),
            });

            this.logger.info("Driver application PDF generated successfully");
            return pdf;
        } catch (error) {
            this.logger.error(
                "Error generating driver application PDF:",
                error
            );
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * Generate ride receipt PDF
     * @param {Object} rideData - Ride receipt data
     * @param {string} [rideData.pickup] - Pickup location
     * @param {string} [rideData.destination] - Dropoff location
     * @param {string|number} [rideData.distance] - Distance in km
     * @param {string|number} [rideData.duration] - Duration in minutes
     * @param {string} [rideData.driverName]
     * @param {string|number} [rideData.driverRating]
     * @param {string|number} [rideData.baseFare]
     * @param {string|number} [rideData.distanceFare]
     * @param {string|number} [rideData.timeFare]
     * @param {string|number} [rideData.totalFare]
     * @param {string} [rideData.paymentMethod]
     * @param {boolean} [rideData.surge]
     * @param {string|number} [rideData.surgeFare]
     * @returns {Promise<Buffer>} PDF buffer
     */
    async generateRideReceipt(rideData = {}) {
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true,
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1200, height: 800 });

            const htmlContent = this.getRideReceiptHTML(rideData);
            await page.setContent(htmlContent, { waitUntil: "networkidle0" });

            const pdf = await page.pdf({
                format: "A4",
                printBackground: true,
                margin: {
                    top: "15mm",
                    right: "15mm",
                    bottom: "15mm",
                    left: "15mm",
                },
                displayHeaderFooter: true,
                headerTemplate: this.getHeaderTemplate(),
                footerTemplate: this.getFooterTemplate(),
            });

            this.logger.info("Ride receipt PDF generated successfully");
            return pdf;
        } catch (error) {
            this.logger.error("Error generating ride receipt PDF:", error);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * Get company report HTML template
     */
    getCompanyReportHTML(data) {
        const currentDate = new Date().toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Rapport Tyvaa - ${currentDate}</title>
            <style>
                ${this.getBaseStyles()},
                ${this.getReportStyles()}
            </style>
        </head>
        <body>
            ${this.getReportHeader()}
            ${this.getReportContent(data)}
            ${this.getReportFooter()}
        </body>
        </html>
        `;
    }

    /**
     * Get driver application HTML template
     */
    getDriverApplicationHTML(driverData) {
        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Candidature Chauffeur - Tyvaa</title>
            <style>
                ${this.getBaseStyles()},
                ${this.getApplicationStyles()}
            </style>
        </head>
        <body>
            ${this.getApplicationHeader()}
            ${this.getApplicationContent(driverData)}
            ${this.getApplicationFooter()}
        </body>
        </html>
        `;
    }

    /**
     * Get ride receipt HTML template
     */
    getRideReceiptHTML(rideData) {
        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reçu de Course - Tyvaa</title>
            <style>
                ${this.getBaseStyles()}
                ${this.getReceiptStyles()}
            </style>
        </head>
        <body>
            ${this.getReceiptHeader()}
            ${this.getReceiptContent(rideData)}
            ${this.getReceiptFooter()}
        </body>
        </html>
        `;
    }

    /**
     * Base styles for all PDF documents
     */
    getBaseStyles() {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: ${this.fonts.primary};
                line-height: 1.6;
                color: ${this.brandColors.text};
                background: ${this.brandColors.background};
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .container {
                max-width: 100%;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            .header {
                background: ${this.brandColors.gradient};
                color: ${this.brandColors.white};
                padding: 30px 0;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/></svg>');
                background-size: 50px 50px;
                opacity: 0.1;
            }
            
            .logo {
                font-size: 48px;
                font-weight: bold;
                font-family: ${this.fonts.heading};
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                position: relative;
                z-index: 1;
            }
            
            .tagline {
                font-size: 18px;
                opacity: 0.9;
                font-weight: 300;
                position: relative;
                z-index: 1;
            }
            
            .section {
                margin: 40px 0;
                padding: 30px;
                background: ${this.brandColors.white};
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                border: 1px solid rgba(106, 13, 173, 0.1);
            }
            
            .section-title {
                font-size: 24px;
                font-weight: bold;
                color: ${this.brandColors.primary};
                margin-bottom: 20px;
                font-family: ${this.fonts.heading};
                position: relative;
                padding-bottom: 10px;
            }
            
            .section-title::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 60px;
                height: 3px;
                background: ${this.brandColors.gradient};
                border-radius: 2px;
            }
            
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            
            .card {
                background: linear-gradient(135deg, ${this.brandColors.white} 0%, #f8f9fa 100%);
                border: 1px solid rgba(106, 13, 173, 0.1);
                border-radius: 8px;
                padding: 20px;
                transition: transform 0.3s ease;
            }
            
            .card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 25px rgba(106, 13, 173, 0.15);
            }
            
            .metric {
                text-align: center;
                padding: 20px;
            }
            
            .metric-value {
                font-size: 36px;
                font-weight: bold;
                color: ${this.brandColors.primary};
                margin-bottom: 5px;
            }
            
            .metric-label {
                font-size: 14px;
                color: ${this.brandColors.lightText};
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                background: ${this.brandColors.white};
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .table th {
                background: ${this.brandColors.primary};
                color: ${this.brandColors.white};
                padding: 15px;
                text-align: left;
                font-weight: 600;
            }
            
            .table td {
                padding: 12px 15px;
                border-bottom: 1px solid #eee;
            }
            
            .table tr:hover {
                background: rgba(106, 13, 173, 0.05);
            }
            
            .footer {
                text-align: center;
                padding: 30px;
                background: ${this.brandColors.text};
                color: ${this.brandColors.white};
                margin-top: 40px;
            }
            
            .footer-content {
                max-width: 800px;
                margin: 0 auto;
            }
            
            .contact-info {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin-top: 20px;
                flex-wrap: wrap;
            }
            
            .contact-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }
            
            .badge {
                display: inline-block;
                padding: 4px 12px;
                background: ${this.brandColors.primary};
                color: ${this.brandColors.white};
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .badge.success { background: ${this.brandColors.success}; }
            .badge.warning { background: ${this.brandColors.warning}; }
            .badge.error { background: ${this.brandColors.error}; }
            
            .highlight {
                background: linear-gradient(120deg, transparent 0%, rgba(106, 13, 173, 0.1) 50%, transparent 100%);
                padding: 2px 4px;
                border-radius: 3px;
            }
            
            @media print {
                .page-break {
                    page-break-before: always;
                }
            }
        `;
    }

    /**
     * Report-specific styles
     */
    getReportStyles() {
        return `
            .executive-summary {
                background: linear-gradient(135deg, ${this.brandColors.primary} 0%, ${this.brandColors.secondary} 100%);
                color: ${this.brandColors.white};
                padding: 40px;
                border-radius: 12px;
                margin: 30px 0;
                text-align: center;
            }
            
            .executive-summary h2 {
                font-size: 28px;
                margin-bottom: 20px;
                font-family: ${this.fonts.heading};
            }
            
            .executive-summary p {
                font-size: 16px;
                line-height: 1.8;
                opacity: 0.95;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            
            .stat-card {
                background: ${this.brandColors.white};
                border: 2px solid ${this.brandColors.primary};
                border-radius: 10px;
                padding: 25px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .stat-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: ${this.brandColors.gradient};
            }
            
            .growth-indicator {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-size: 14px;
                margin-top: 10px;
            }
            
            .growth-up { color: ${this.brandColors.success}; }
            .growth-down { color: ${this.brandColors.error}; }
        `;
    }

    /**
     * Application-specific styles
     */
    getApplicationStyles() {
        return `
            .application-form {
                background: ${this.brandColors.white};
                padding: 40px;
                border-radius: 12px;
                margin: 20px 0;
            }
            
            .form-section {
                margin: 30px 0;
                padding: 20px;
                border-left: 4px solid ${this.brandColors.primary};
                background: rgba(106, 13, 173, 0.02);
            }
            
            .form-field {
                margin: 15px 0;
                display: flex;
                align-items: center;
                gap: 20px;
            }
            
            .form-label {
                font-weight: 600;
                color: ${this.brandColors.text};
                min-width: 150px;
            }
            
            .form-value {
                color: ${this.brandColors.lightText};
                flex: 1;
            }
            
            .document-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            
            .document-item {
                background: ${this.brandColors.white};
                border: 1px solid rgba(106, 13, 173, 0.2);
                border-radius: 8px;
                padding: 15px;
                text-align: center;
            }
            
            .document-status {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                margin-top: 8px;
            }
            
            .status-pending { background: ${this.brandColors.warning}; color: white; }
            .status-approved { background: ${this.brandColors.success}; color: white; }
            .status-rejected { background: ${this.brandColors.error}; color: white; }
        `;
    }

    /**
     * Receipt-specific styles
     */
    getReceiptStyles() {
        return `
            .receipt-header {
                background: ${this.brandColors.gradient};
                color: ${this.brandColors.white};
                padding: 30px;
                border-radius: 12px;
                margin-bottom: 30px;
                text-align: center;
            }
            
            .receipt-number {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            
            .receipt-date {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .ride-details {
                background: ${this.brandColors.white};
                border: 1px solid rgba(106, 13, 173, 0.1);
                border-radius: 8px;
                padding: 25px;
                margin: 20px 0;
            }
            
            .route-info {
                display: flex;
                align-items: center;
                gap: 20px;
                margin: 20px 0;
                padding: 20px;
                background: rgba(106, 13, 173, 0.05);
                border-radius: 8px;
            }
            
            .location-point {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: ${this.brandColors.primary};
            }
            
            .location-line {
                flex: 1;
                height: 2px;
                background: linear-gradient(90deg, ${this.brandColors.primary}, ${this.brandColors.secondary});
            }
            
            .pricing-breakdown {
                background: ${this.brandColors.white};
                border: 2px solid ${this.brandColors.primary};
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .price-line {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            
            .price-line:last-child {
                border-bottom: none;
                font-weight: bold;
                font-size: 18px;
                color: ${this.brandColors.primary};
                border-top: 2px solid ${this.brandColors.primary};
                padding-top: 15px;
                margin-top: 10px;
            }
            
            .qr-code {
                text-align: center;
                margin: 30px 0;
                padding: 20px;
                background: ${this.brandColors.white};
                border-radius: 8px;
            }
        `;
    }

    /**
     * Get report header
     */
    getReportHeader() {
        return `
            <div class="header">
                <div class="container">
                    <div class="logo">TYVAA</div>
                    <div class="tagline">Révolutionner le Transport au Sénégal</div>
                </div>
            </div>
        `;
    }

    /**
     * Get report content
     */
    getReportContent(data) {
        const currentDate = new Date().toLocaleDateString("fr-FR");
        const stats = data.stats || {};

        return `
            <div class="container">
                <div class="executive-summary">
                    <h2>Rapport Exécutif</h2>
                    <p>Tyvaa continue de révolutionner le secteur du transport au Sénégal avec une croissance exceptionnelle et un engagement constant envers l'excellence. Notre plateforme technologique de pointe connecte des millions d'utilisateurs à travers le pays, offrant des solutions de mobilité sûres, fiables et accessibles.</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="metric-value">${stats.totalRides || "250,000"}+</div>
                        <div class="metric-label">Courses Effectuées</div>
                        <div class="growth-indicator growth-up">↗ +15% ce mois</div>
                    </div>
                    <div class="stat-card">
                        <div class="metric-value">${stats.activeDrivers || "5,000"}+</div>
                        <div class="metric-label">Chauffeurs Actifs</div>
                        <div class="growth-indicator growth-up">↗ +8% ce mois</div>
                    </div>
                    <div class="stat-card">
                        <div class="metric-value">${stats.totalUsers || "100,000"}+</div>
                        <div class="metric-label">Utilisateurs Actifs</div>
                        <div class="growth-indicator growth-up">↗ +22% ce mois</div>
                    </div>
                    <div class="stat-card">
                        <div class="metric-value">${stats.revenue || "2.5M"}€</div>
                        <div class="metric-label">Chiffre d'Affaires</div>
                        <div class="growth-indicator growth-up">↗ +18% ce mois</div>
                    </div>
                </div>
                
                <div class="section">
                    <h2 class="section-title">Performance Opérationnelle</h2>
                    <div class="grid">
                        <div class="card">
                            <h3>Satisfaction Client</h3>
                            <div class="metric">
                                <div class="metric-value">4.8/5</div>
                                <div class="metric-label">Note Moyenne</div>
                            </div>
                            <p>Excellence dans la qualité de service avec plus de 95% de satisfaction client.</p>
                        </div>
                        <div class="card">
                            <h3>Temps de Réponse</h3>
                            <div class="metric">
                                <div class="metric-value">3.2 min</div>
                                <div class="metric-label">Temps Moyen</div>
                            </div>
                            <p>Réduction de 40% du temps d'attente grâce à notre algorithme optimisé.</p>
                        </div>
                        <div class="card">
                            <h3>Couverture Géographique</h3>
                            <div class="metric">
                                <div class="metric-value">14</div>
                                <div class="metric-label">Villes Couvertes</div>
                            </div>
                            <p>Expansion continue dans toutes les régions du Sénégal.</p>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h2 class="section-title">Innovation Technologique</h2>
                    <div class="grid">
                        <div class="card">
                            <h3>Architecture Modulaire</h3>
                            <p>Notre architecture <span class="highlight">modular monolith</span> basée sur Fastify assure une performance exceptionnelle et une scalabilité optimale.</p>
                            <div class="badge">Haute Performance</div>
                        </div>
                        <div class="card">
                            <h3>Sécurité Avancée</h3>
                            <p>Système de sécurité multicouche avec authentification JWT et chiffrement end-to-end pour protéger les données utilisateurs.</p>
                            <div class="badge success">Sécurisé</div>
                        </div>
                        <div class="card">
                            <h3>Intelligence Artificielle</h3>
                            <p>Algorithmes d'IA pour l'optimisation des trajets, la prédiction de la demande et l'amélioration continue de l'expérience utilisateur.</p>
                            <div class="badge">IA Intégrée</div>
                        </div>
                    </div>
                </div>
                
                <div class="page-break"></div>
                
                <div class="section">
                    <h2 class="section-title">Données Financières</h2>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Période</th>
                                <th>Revenus</th>
                                <th>Courses</th>
                                <th>Croissance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Q1 2024</td>
                                <td>850,000 €</td>
                                <td>85,000</td>
                                <td><span class="badge success">+25%</span></td>
                            </tr>
                            <tr>
                                <td>Q2 2024</td>
                                <td>1,200,000 €</td>
                                <td>120,000</td>
                                <td><span class="badge success">+41%</span></td>
                            </tr>
                            <tr>
                                <td>Q3 2024</td>
                                <td>1,800,000 €</td>
                                <td>180,000</td>
                                <td><span class="badge success">+50%</span></td>
                            </tr>
                            <tr>
                                <td>Q4 2024</td>
                                <td>2,500,000 €</td>
                                <td>250,000</td>
                                <td><span class="badge success">+39%</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="section">
                    <h2 class="section-title">Impact Social</h2>
                    <p>Tyvaa ne se contente pas de révolutionner le transport, nous créons des opportunités économiques et contribuons au développement durable du Sénégal :</p>
                    <ul style="margin: 20px 0; padding-left: 20px; line-height: 1.8;">
                        <li><strong>Emploi :</strong> Plus de 5,000 chauffeurs partenaires avec des revenus stables</li>
                        <li><strong>Écologie :</strong> Réduction de 30% des émissions grâce à l'optimisation des trajets</li>
                        <li><strong>Inclusion :</strong> Accès au transport pour les zones rurales et périurbaines</li>
                        <li><strong>Économie :</strong> Contribution de 15M€ au PIB national</li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Get report footer
     */
    getReportFooter() {
        return `
            <div class="footer">
                <div class="footer-content">
                    <div class="logo" style="font-size: 24px; margin-bottom: 15px;">TYVAA</div>
                    <p style="margin-bottom: 20px;">Révolutionner le Transport au Sénégal</p>
                    <div class="contact-info">
                        <div class="contact-item">
                            <strong>📧</strong> contact@tyvaa.sn
                        </div>
                        <div class="contact-item">
                            <strong>📞</strong> +221 33 xxx xx xx
                        </div>
                        <div class="contact-item">
                            <strong>🌐</strong> www.tyvaa.sn
                        </div>
                        <div class="contact-item">
                            <strong>📍</strong> Dakar, Sénégal
                        </div>
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
                        © 2024 Tyvaa Corporation. Tous droits réservés. Document confidentiel.
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Get application header
     */
    getApplicationHeader() {
        return `
            <div class="header">
                <div class="container">
                    <div class="logo">TYVAA</div>
                    <div class="tagline">Candidature Chauffeur Partenaire</div>
                </div>
            </div>
        `;
    }

    /**
     * Get application content
     */
    getApplicationContent(driverData) {
        const data = driverData || {};

        return `
            <div class="container">
                <div class="application-form">
                    <h2 class="section-title">Informations Personnelles</h2>
                    <div class="form-section">
                        <div class="form-field">
                            <div class="form-label">Nom Complet:</div>
                            <div class="form-value">${data.fullName || "N/A"}</div>
                        </div>
                        <div class="form-field">
                            <div class="form-label">Date de Naissance:</div>
                            <div class="form-value">${data.birthDate || "N/A"}</div>
                        </div>
                        <div class="form-field">
                            <div class="form-label">Téléphone:</div>
                            <div class="form-value">${data.phone || "N/A"}</div>
                        </div>
                        <div class="form-field">
                            <div class="form-label">Email:</div>
                            <div class="form-value">${data.email || "N/A"}</div>
                        </div>
                        <div class="form-field">
                            <div class="form-label">Adresse:</div>
                            <div class="form-value">${data.address || "N/A"}</div>
                        </div>
                    </div>
                    
                    <h2 class="section-title">Expérience Professionnelle</h2>
                    <div class="form-section">
                        <div class="form-field">
                            <div class="form-label">Années d'Expérience:</div>
                            <div class="form-value">${data.experience || "N/A"} ans</div>
                        </div>
                        <div class="form-field">
                            <div class="form-label">Type de Permis:</div>
                            <div class="form-value">${data.licenseType || "N/A"}</div>
                        </div>
                        <div class="form-field">
                            <div class="form-label">Véhicule:</div>
                            <div class="form-value">${data.vehicle || "N/A"}</div>
                        </div>
                    </div>
                    
                    <h2 class="section-title">Documents Requis</h2>
                    <div class="document-grid">
                        <div class="document-item">
                            <h4>Permis de Conduire</h4>
                            <div class="document-status ${data.licenseStatus || "status-pending"}">${data.licenseStatus || "En attente"}</div>
                        </div>
                        <div class="document-item">
                            <h4>Carte d'Identité</h4>
                            <div class="document-status ${data.idStatus || "status-pending"}">${data.idStatus || "En attente"}</div>
                        </div>
                        <div class="document-item">
                            <h4>Assurance Véhicule</h4>
                            <div class="document-status ${data.insuranceStatus || "status-pending"}">${data.insuranceStatus || "En attente"}</div>
                        </div>
                        <div class="document-item">
                            <h4>Casier Judiciaire</h4>
                            <div class="document-status ${data.criminalRecordStatus || "status-pending"}">${data.criminalRecordStatus || "En attente"}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get application footer
     */
    getApplicationFooter() {
        return `
            <div class="footer">
                <div class="footer-content">
                    <p><strong>Prochaines Étapes :</strong></p>
                    <p>1. Vérification des documents • 2. Entretien téléphonique • 3. Formation • 4. Activation du compte</p>
                    <div class="contact-info" style="margin-top: 30px;">
                        <div class="contact-item">
                            <strong>📧</strong> recrutement@tyvaa.sn
                        </div>
                        <div class="contact-item">
                            <strong>📞</strong> +221 33 xxx xx xx
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get receipt header
     */
    getReceiptHeader() {
        return `
            <div class="receipt-header">
                <div class="logo" style="font-size: 36px; margin-bottom: 10px;">TYVAA</div>
                <div class="receipt-number">Reçu #${Date.now().toString().slice(-6)}</div>
                <div class="receipt-date">${new Date().toLocaleDateString("fr-FR")}</div>
            </div>
        `;
    }

    /**
     * Get receipt content
     */
    getReceiptContent(rideData) {
        const data = rideData || {};

        return `
            <div class="container">
                <div class="ride-details">
                    <h2 class="section-title">Détails de la Course</h2>
                    <div class="route-info">
                        <div class="location-point"></div>
                        <div style="flex-direction: column; flex: 1;">
                            <div><strong>Départ:</strong> ${data.pickup || "Adresse de départ"}</div>
                            <div class="location-line" style="margin: 10px 0;"></div>
                            <div><strong>Arrivée:</strong> ${data.destination || "Adresse d'arrivée"}</div>
                        </div>
                        <div class="location-point"></div>
                    </div>
                    
                    <div class="grid">
                        <div class="card">
                            <h4>Distance</h4>
                            <div class="metric-value" style="font-size: 24px;">${data.distance || "12.5"} km</div>
                        </div>
                        <div class="card">
                            <h4>Durée</h4>
                            <div class="metric-value" style="font-size: 24px;">${data.duration || "25"} min</div>
                        </div>
                        <div class="card">
                            <h4>Chauffeur</h4>
                            <div style="margin-top: 10px;">
                                <div><strong>${data.driverName || "Nom du chauffeur"}</strong></div>
                                <div>⭐ ${data.driverRating || "4.9"}/5</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="pricing-breakdown">
                    <h2 class="section-title">Détail des Tarifs</h2>
                    <div class="price-line">
                        <span>Course de base</span>
                        <span>${data.baseFare || "1,500"} FCFA</span>
                    </div>
                    <div class="price-line">
                        <span>Distance (${data.distance || "12.5"} km)</span>
                        <span>${data.distanceFare || "2,500"} FCFA</span>
                    </div>
                    <div class="price-line">
                        <span>Temps (${data.duration || "25"} min)</span>
                        <span>${data.timeFare || "750"} FCFA</span>
                    </div>
                    ${
                        data.surge
                            ? `<div class="price-line">
                        <span>Tarif de pointe</span>
                        <span>${data.surgeFare || "500"} FCFA</span>
                    </div>`
                            : ""
                    }
                    <div class="price-line">
                        <span><strong>Total</strong></span>
                        <span><strong>${data.totalFare || "4,750"} FCFA</strong></span>
                    </div>
                </div>
                
                <div class="section">
                    <h2 class="section-title">Informations de Paiement</h2>
                    <div class="form-field">
                        <div class="form-label">Méthode de Paiement:</div>
                        <div class="form-value">${data.paymentMethod || "Espèces"}</div>
                    </div>
                    <div class="form-field">
                        <div class="form-label">Statut:</div>
                        <div class="form-value"><span class="badge success">Payé</span></div>
                    </div>
                    <div class="form-field">
                        <div class="form-label">Date:</div>
                        <div class="form-value">${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</div>
                    </div>
                </div>
                
                <div class="qr-code">
                    <p style="margin-bottom: 20px;"><strong>Code QR pour vérification</strong></p>
                    <div style="width: 100px; height: 100px; background: #f0f0f0; border: 2px solid #6a0dad; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                        QR Code
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get receipt footer
     */
    getReceiptFooter() {
        return `
            <div class="footer">
                <div class="footer-content">
                    <p><strong>Merci de faire confiance à Tyvaa !</strong></p>
                    <p>Évaluez votre course et votre chauffeur dans l'application.</p>
                    <div class="contact-info" style="margin-top: 20px;">
                        <div class="contact-item">
                            <strong>📧</strong> support@tyvaa.sn
                        </div>
                        <div class="contact-item">
                            <strong>📞</strong> +221 33 xxx xx xx
                        </div>
                        <div class="contact-item">
                            <strong>🌐</strong> www.tyvaa.sn
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get header template for PDF
     */
    getHeaderTemplate() {
        return `
            <div style="font-size: 10px; padding: 5px; width: 100%; text-align: center; color: #6a0dad;">
                <span>TYVAA - Révolutionner le Transport au Sénégal</span>
            </div>
        `;
    }

    /**
     * Get footer template for PDF
     */
    getFooterTemplate() {
        return `
            <div style="font-size: 10px; padding: 5px; width: 100%; text-align: center; color: #666;">
                <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span> | © 2024 Tyvaa Corporation | Confidentiel</span>
            </div>
        `;
    }

    /**
     * Save PDF to file
     * @param {Buffer} pdf - PDF buffer
     * @param {string} filename - Output file path
     * @returns {Promise<string>} The filename
     */
    async savePDF(pdf, filename) {
        try {
            await writeFile(filename, pdf);
            this.logger.info(`PDF saved successfully: ${filename}`);
            return filename;
        } catch (error) {
            this.logger.error(`Error saving PDF: ${error}`);
            throw error;
        }
    }
}

const pdfGenerator = new TyvaaPDFGenerator();
export default pdfGenerator;
export { TyvaaPDFGenerator };

if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        try {
            console.log("🚀 Generating beautiful Tyvaa PDF...");
            // Example usage:
            // const reportPdf = await pdfGenerator.generateCompanyReport({ stats: { totalRides: 1000 } });
            // await pdfGenerator.savePDF(reportPdf, 'tyvaa-company-report.pdf');
            // const driverPdf = await pdfGenerator.generateDriverApplication({ fullName: 'John Doe' });
            // await pdfGenerator.savePDF(driverPdf, 'tyvaa-driver-application.pdf');
            // const receiptPdf = await pdfGenerator.generateRideReceipt({ pickup: 'A', destination: 'B' });
            // await pdfGenerator.savePDF(receiptPdf, 'tyvaa-ride-receipt.pdf');
        } catch (error) {
            console.error("❌ Error generating PDFs:", error);
        }
    })();
}
