/**
 * Migration to update Payment table for DEXCHANGE integration
 * Adds new fields: externalTransactionId, fee, provider, paymentUrl
 * Updates existing fields with better constraints and indexes
 */

export const up = async (queryInterface, Sequelize) => {
    // Add new columns for DEXCHANGE integration
    await queryInterface.addColumn("payments", "external_transaction_id", {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
        comment: "Our internal transaction reference",
    });

    await queryInterface.addColumn("payments", "fee", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: "Payment processing fee",
    });

    await queryInterface.addColumn("payments", "provider", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "dexchange",
        comment: "Payment provider (dexchange, cinetpay, etc.)",
    });

    await queryInterface.addColumn("payments", "payment_url", {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Payment URL for user redirection",
    });

    // Update existing columns
    await queryInterface.changeColumn("payments", "amount", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: "Payment amount",
    });

    await queryInterface.changeColumn("payments", "status", {
        type: Sequelize.ENUM(
            "pending",
            "processing",
            "completed",
            "failed",
            "cancelled"
        ),
        allowNull: false,
        defaultValue: "pending",
    });

    await queryInterface.changeColumn("payments", "currency", {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: "XOF",
    });

    await queryInterface.changeColumn("payments", "payment_method", {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Payment method (orange, wave, mtn, etc.)",
    });

    await queryInterface.changeColumn("payments", "phone", {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Customer phone number",
    });

    await queryInterface.changeColumn("payments", "metadata", {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Additional metadata as JSON string",
    });

    // Add indexes for better performance
    await queryInterface.addIndex("payments", ["booking_id"], {
        name: "idx_payments_booking_id",
    });

    await queryInterface.addIndex("payments", ["status"], {
        name: "idx_payments_status",
    });

    await queryInterface.addIndex("payments", ["provider"], {
        name: "idx_payments_provider",
    });

    await queryInterface.addIndex("payments", ["payment_method"], {
        name: "idx_payments_payment_method",
    });

    await queryInterface.addIndex("payments", ["created_at"], {
        name: "idx_payments_created_at",
    });

    await queryInterface.addIndex("payments", ["external_transaction_id"], {
        name: "idx_payments_external_transaction_id",
    });
};

export const down = async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex("payments", "idx_payments_booking_id");
    await queryInterface.removeIndex("payments", "idx_payments_status");
    await queryInterface.removeIndex("payments", "idx_payments_provider");
    await queryInterface.removeIndex("payments", "idx_payments_payment_method");
    await queryInterface.removeIndex("payments", "idx_payments_created_at");
    await queryInterface.removeIndex(
        "payments",
        "idx_payments_external_transaction_id"
    );

    // Remove new columns
    await queryInterface.removeColumn("payments", "external_transaction_id");
    await queryInterface.removeColumn("payments", "fee");
    await queryInterface.removeColumn("payments", "provider");
    await queryInterface.removeColumn("payments", "payment_url");

    // Revert column changes (basic revert)
    await queryInterface.changeColumn("payments", "amount", {
        type: Sequelize.INTEGER,
        allowNull: false,
    });

    await queryInterface.changeColumn("payments", "status", {
        type: Sequelize.ENUM("PENDING", "COMPLETED", "FAILED", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
    });
};
