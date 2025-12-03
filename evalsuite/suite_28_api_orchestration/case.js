/**
 * Test Case: Comprehensive API Orchestration - E-Commerce Flow Analysis
 * Tests API call sequences, data dependencies, and error propagation
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_28_api_orchestration",
  name: "Comprehensive API Orchestration - E-Commerce Flow Analysis",

  theory_NL: "E-commerce API sequence with 8 calls. auth_api→cart_api→inventory_api→pricing_api→payment_api→order_api→shipping_api→notification_api. Data flows: auth produces token used by all. cart produces cart_items. inventory validates availability. pricing calculates final_price. payment produces transaction_id. order produces order_id. shipping produces tracking_number. notification confirms order. Errors: declined→payment_error, invalid_address→shipping_error, out_of_stock→inventory_error. API types: auth_api is security_api, cart_api and inventory_api are data_api, payment_api is financial_api, notification_api is messaging_api.",

  theory_DSL: [
    "call_1 INVOKES auth_api", "call_1 OUTPUTS auth_token", "auth_api IS_A security_api",
    "call_2 INVOKES cart_api", "call_2 USES auth_token", "call_2 OUTPUTS cart_items", "cart_api IS_A data_api",
    "call_3 INVOKES inventory_api", "call_3 USES auth_token", "call_3 USES cart_items", "call_3 OUTPUTS availability_status", "inventory_api IS_A data_api",
    "call_4 INVOKES pricing_api", "call_4 USES cart_items", "call_4 USES availability_status", "call_4 OUTPUTS final_price", "pricing_api IS_A data_api",
    "call_5 INVOKES payment_api", "call_5 USES auth_token", "call_5 USES final_price", "call_5 OUTPUTS transaction_id", "payment_api IS_A financial_api",
    "call_6 INVOKES order_api", "call_6 USES auth_token", "call_6 USES transaction_id", "call_6 OUTPUTS order_id", "order_api IS_A data_api",
    "call_7 INVOKES shipping_api", "call_7 USES order_id", "call_7 OUTPUTS tracking_number", "shipping_api IS_A logistics_api",
    "call_8 INVOKES notification_api", "call_8 USES order_id", "call_8 USES tracking_number", "call_8 OUTPUTS confirmation", "notification_api IS_A messaging_api",
    "auth_token FLOWS_TO call_2", "auth_token FLOWS_TO call_3", "auth_token FLOWS_TO call_5", "auth_token FLOWS_TO call_6",
    "cart_items FLOWS_TO call_3", "cart_items FLOWS_TO call_4",
    "availability_status FLOWS_TO call_4", "final_price FLOWS_TO call_5",
    "transaction_id FLOWS_TO call_6", "order_id FLOWS_TO call_7", "order_id FLOWS_TO call_8", "tracking_number FLOWS_TO call_8",
    "declined ABORTS_WITH payment_error", "invalid_address ABORTS_WITH shipping_error", "out_of_stock ABORTS_WITH inventory_error",
    "security_api IS_A api_type", "data_api IS_A api_type", "financial_api IS_A api_type", "logistics_api IS_A api_type", "messaging_api IS_A api_type",
    "api_type IS_A service_component", "service_component IS_A system_element"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Trace full order flow: auth → confirmation",
      TASK_DSL: "@q1 call_1 PROVISIONS confirmation",
      ANSWEAR_NL: "auth→cart→inventory→pricing→payment→order→shipping→notification. 8 API calls in sequence.",
      PROOF_DSL: `@p1 call_1 OUTPUTS auth_token
@p2 call_2 USES auth_token
@p3 call_2 OUTPUTS cart_items
@p4 call_3 USES cart_items
@p5 call_3 OUTPUTS availability_status
@p6 call_4 USES availability_status
@p7 call_4 OUTPUTS final_price
@p8 call_5 USES final_price
@p9 call_5 OUTPUTS transaction_id
@p10 call_6 USES transaction_id
@p11 call_6 OUTPUTS order_id
@p12 call_7 USES order_id
@p13 call_7 OUTPUTS tracking_number
@p14 call_8 USES tracking_number
@p15 call_8 OUTPUTS confirmation
@c1 $p1 LEADS_TO $p2
@c2 $p3 LEADS_TO $p4
@c3 $p5 LEADS_TO $p6
@c4 $p7 LEADS_TO $p8
@c5 $p9 LEADS_TO $p10
@c6 $p11 LEADS_TO $p12
@c7 $p13 LEADS_TO $p14
@c8 $p14 LEADS_TO $p15
@chain $c8 COMPLETES trace
@result $chain IS_A flow_trace_proof
@proof $result PROVES $q1`,
      PROOF_NL: "8-call chain: auth→cart→inventory→pricing→payment→order→shipping→notification."
    },
    {
      id: "q2", TASK_NL: "What depends on auth_token? (Fan-out analysis)",
      TASK_DSL: "@q2 auth_token HAS dependents",
      ANSWEAR_NL: "call_2 (cart), call_3 (inventory), call_5 (payment), call_6 (order) all use auth_token. 4 dependents.",
      PROOF_DSL: `@p1 call_2 USES auth_token
@p2 call_3 USES auth_token
@p3 call_5 USES auth_token
@p4 call_6 USES auth_token
@c1 $p1 IDENTIFIES dependent_1
@c2 $p2 IDENTIFIES dependent_2
@c3 $p3 IDENTIFIES dependent_3
@c4 $p4 IDENTIFIES dependent_4
@c5 $c1 COMBINES $c4
@result $c5 IS_A dependency_analysis_proof
@proof $result PROVES $q2`,
      PROOF_NL: "4 calls depend on auth_token. Auth is critical single point of dependency."
    },
    {
      id: "q3", TASK_NL: "What if payment fails? What is blocked?",
      TASK_DSL: "@q3 payment_failure BLOCKS downstream",
      ANSWEAR_NL: "Payment failure blocks order_api, shipping_api, notification_api. 3 downstream calls blocked.",
      PROOF_DSL: `@p1 declined ABORTS_WITH payment_error
@p2 call_5 OUTPUTS transaction_id
@p3 call_6 USES transaction_id
@p4 call_6 OUTPUTS order_id
@p5 call_7 USES order_id
@p6 call_8 USES order_id
@c1 $p1 BLOCKS $p2
@c2 $c1 BLOCKS $p3
@c3 $c2 BLOCKS $p4
@c4 $c3 BLOCKS $p5
@c5 $c3 BLOCKS $p6
@cascade $c5 CONFIRMS failure
@result $cascade IS_A failure_cascade_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Payment failure cascades to 3 downstream: order, shipping, notification."
    },
    {
      id: "q4", TASK_NL: "Is notification_api a system_element? (Deep hierarchy)",
      TASK_DSL: "@q4 notification_api IS_A system_element",
      ANSWEAR_NL: "notification_api→messaging_api→api_type→service_component→system_element. 4-step chain.",
      PROOF_DSL: `@p1 notification_api IS_A messaging_api
@p2 messaging_api IS_A api_type
@p3 api_type IS_A service_component
@p4 service_component IS_A system_element
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@chain $c3 REACHES system_element
@result $chain IS_A transitive_inheritance_proof
@proof $result PROVES $q4`,
      PROOF_NL: "4-step: notification→messaging→api_type→service→system_element."
    },
    {
      id: "q5", TASK_NL: "What data does call_8 need? (Multi-input analysis)",
      TASK_DSL: "@q5 call_8 HAS inputs",
      ANSWEAR_NL: "call_8 uses order_id and tracking_number. 2 inputs from different upstream calls.",
      PROOF_DSL: `@p1 call_8 USES order_id
@p2 call_8 USES tracking_number
@p3 call_6 OUTPUTS order_id
@p4 call_7 OUTPUTS tracking_number
@c1 $p1 FROM $p3
@c2 $p2 FROM $p4
@c3 $c1 COMBINES $c2
@result $c3 IS_A multi_input_proof
@proof $result PROVES $q5`,
      PROOF_NL: "call_8 needs 2 inputs: order_id (from call_6) + tracking_number (from call_7)."
    },
    {
      id: "q6", TASK_NL: "Compare all error types and their sources",
      TASK_DSL: "@q6 errors HAS types",
      ANSWEAR_NL: "3 errors: declined→payment_error, invalid_address→shipping_error, out_of_stock→inventory_error.",
      PROOF_DSL: `@p1 declined ABORTS_WITH payment_error
@p2 invalid_address ABORTS_WITH shipping_error
@p3 out_of_stock ABORTS_WITH inventory_error
@c1 $p1 IS error_type_1
@c2 $p2 IS error_type_2
@c3 $p3 IS error_type_3
@c4 $c1 COMBINES $c3
@result $c4 IS_A error_enumeration_proof
@proof $result PROVES $q6`,
      PROOF_NL: "3 error types: payment (declined), shipping (address), inventory (stock)."
    },
    {
      id: "q7", TASK_NL: "What is the minimum path to get final_price?",
      TASK_DSL: "@q7 final_price REQUIRES minimum_path",
      ANSWEAR_NL: "auth→cart→inventory→pricing = 4 calls to get final_price.",
      PROOF_DSL: `@p1 call_1 OUTPUTS auth_token
@p2 call_2 USES auth_token
@p3 call_2 OUTPUTS cart_items
@p4 call_3 USES cart_items
@p5 call_3 OUTPUTS availability_status
@p6 call_4 USES availability_status
@p7 call_4 OUTPUTS final_price
@c1 $p1 LEADS_TO $p2
@c2 $p2 LEADS_TO $p3
@c3 $p3 LEADS_TO $p4
@c4 $p4 LEADS_TO $p5
@c5 $p5 LEADS_TO $p6
@c6 $p6 LEADS_TO $p7
@path $c6 COMPLETES minimum
@result $path IS_A minimum_path_proof
@proof $result PROVES $q7`,
      PROOF_NL: "4 calls: auth→cart→inventory→pricing to get final_price."
    },
    {
      id: "q8", TASK_NL: "Group APIs by type",
      TASK_DSL: "@q8 apis GROUPED_BY type",
      ANSWEAR_NL: "security: auth. data: cart,inventory,pricing,order. financial: payment. logistics: shipping. messaging: notification.",
      PROOF_DSL: `@p1 auth_api IS_A security_api
@p2 cart_api IS_A data_api
@p3 inventory_api IS_A data_api
@p4 pricing_api IS_A data_api
@p5 order_api IS_A data_api
@p6 payment_api IS_A financial_api
@p7 shipping_api IS_A logistics_api
@p8 notification_api IS_A messaging_api
@c1 $p1 GROUPS security
@c2 $p2 GROUPS data
@c3 $p6 GROUPS financial
@c4 $p7 GROUPS logistics
@c5 $p8 GROUPS messaging
@c6 $c1 COMBINES $c5
@result $c6 IS_A classification_proof
@proof $result PROVES $q8`,
      PROOF_NL: "5 categories: security(1), data(4), financial(1), logistics(1), messaging(1)."
    }
  ]
};
