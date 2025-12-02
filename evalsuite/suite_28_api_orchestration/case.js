/**
 * Test Case: API Call Sequencing - E-Commerce Order Flow
 * Tests API call sequence planning with DSL-validatable proof chains for e-commerce order processing.
 * Version: 3.0
 */

module.exports = {
  id: "suite_28_api_orchestration",
  name: "API Call Sequencing - E-Commerce Order Flow",
  description: "Tests API call sequence planning with DSL-validatable proof chains for e-commerce order processing.",
  theory: {
    natural_language: "ORDER PROCESSING: Call 1 invokes auth_api outputting auth_token. Call 2 invokes cart_api using token outputting cart_contents. Call 3 invokes inventory_api using token and items outputting availability_status. Call 4 invokes pricing_api using items outputting final_price. Call 5 invokes payment_api using token and total outputting transaction_id. Call 6 invokes order_api using token items txn outputting order_id. Call 7 invokes shipping_api using order outputting tracking_number. Call 8 invokes notification_api using order and tracking. ERROR SCENARIOS: declined aborts with payment_error. invalid_address aborts with shipping_error.",
    expected_facts: [
          "call_1 INVOKES auth_api",
          "call_1 OUTPUTS auth_token",
          "call_1 TO_VAR token",
          "call_2 INVOKES cart_api",
          "call_2 USES_VAR token",
          "call_2 OUTPUTS cart_contents",
          "call_3 INVOKES inventory_api",
          "call_3 USES_VAR token",
          "call_3 USES_VAR items",
          "call_4 INVOKES pricing_api",
          "call_4 USES_VAR items",
          "call_4 OUTPUTS final_price",
          "call_5 INVOKES payment_api",
          "call_5 USES_VAR token",
          "call_5 USES_VAR total",
          "call_5 OUTPUTS transaction_id",
          "call_6 INVOKES order_api",
          "call_6 USES_VAR token",
          "call_6 USES_VAR items",
          "call_6 USES_VAR txn",
          "call_6 OUTPUTS order_id",
          "call_7 INVOKES shipping_api",
          "call_7 USES_VAR order",
          "call_7 OUTPUTS tracking_number",
          "call_8 INVOKES notification_api",
          "call_8 USES_VAR order",
          "call_8 USES_VAR tracking",
          "declined ABORTS_WITH payment_error",
          "invalid_address ABORTS_WITH shipping_error"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "INIT: What is the first API call?",
      expected_dsl: `
        @inv call_1 INVOKES auth_api
        @out call_1 OUTPUTS auth_token
        @q1 $inv AND $out
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q2",
      natural_language: "TOKEN: Which calls use the token?",
      expected_dsl: `
        @u1 call_2 USES_VAR token
        @u2 call_3 USES_VAR token
        @u3 call_5 USES_VAR token
        @u4 call_6 USES_VAR token
        @p1 $u1 AND $u2
        @p2 $u3 AND $u4
        @q2 $p1 AND $p2
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q3",
      natural_language: "PAYMENT: What does call_5 need?",
      expected_dsl: `
        @v1 call_5 USES_VAR token
        @v2 call_5 USES_VAR total
        @q3 $v1 AND $v2
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q4",
      natural_language: "ORDER: What variables does call_6 use?",
      expected_dsl: `
        @v1 call_6 USES_VAR token
        @v2 call_6 USES_VAR items
        @v3 call_6 USES_VAR txn
        @p1 $v1 AND $v2
        @q4 $p1 AND $v3
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q5",
      natural_language: "OUTPUTS: What does call_4 output?",
      expected_dsl: `
        @inv call_4 INVOKES pricing_api
        @out call_4 OUTPUTS final_price
        @q5 $inv AND $out
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q6",
      natural_language: "ERROR: What happens on declined payment?",
      expected_dsl: `@q6 declined ABORTS_WITH payment_error`,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q7",
      natural_language: "SHIPPING: What does call_7 output?",
      expected_dsl: `
        @inv call_7 INVOKES shipping_api
        @out call_7 OUTPUTS tracking_number
        @q7 $inv AND $out
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q8",
      natural_language: "NOTIFICATION: What does call_8 use?",
      expected_dsl: `
        @v1 call_8 USES_VAR order
        @v2 call_8 USES_VAR tracking
        @q8 $v1 AND $v2
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    }
  ],
  version: "3.0"
};
