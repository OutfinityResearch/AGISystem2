/**
 * Test Case: Resource Planning - Cloud Infrastructure Provisioning
 * Tests cloud infrastructure planning with DSL-validatable proof chains. Verifies dependencies, costs, and resource constraints.
 * Version: 3.0
 */

module.exports = {
  id: "suite_30_resource_planning",
  name: "Resource Planning - Cloud Infrastructure Provisioning",
  description: "Tests cloud infrastructure planning with DSL-validatable proof chains. Verifies dependencies, costs, and resource constraints.",
  theory: {
    natural_language: "INFRASTRUCTURE: vpc_main uses terraform_vpc outputting vpc_id. subnet_public uses terraform_subnet needing vpc_id outputting subnet_pub_id after vpc_main. subnet_private similarly outputs subnet_priv_id after vpc_main. sg_web uses terraform_security_group allowing port_443 and port_80 outputting sg_web_id after vpc_main. sg_db allows port_5432 after sg_web. ec2_web_1 uses terraform_instance needing subnet_pub_id and sg_web_id costing 30_dollars_month after subnet_public and sg_web. ec2_web_2 similarly. rds_primary uses terraform_rds needing subnet_priv_id and sg_db_id costing 50_dollars_month after subnet_private and sg_db. alb_main uses terraform_alb targeting instance_web_1_id and instance_web_2_id costing 20_dollars_month after ec2_web_1 and ec2_web_2. route53_record outputs dns_name after alb_main.",
    expected_facts: [
          "vpc_main USES terraform_vpc",
          "vpc_main OUTPUTS vpc_id",
          "vpc_main COSTS 0_dollars",
          "subnet_public USES terraform_subnet",
          "subnet_public NEEDS vpc_id",
          "subnet_public OUTPUTS subnet_pub_id",
          "subnet_public AFTER vpc_main",
          "subnet_private USES terraform_subnet",
          "subnet_private NEEDS vpc_id",
          "subnet_private OUTPUTS subnet_priv_id",
          "subnet_private AFTER vpc_main",
          "sg_web USES terraform_security_group",
          "sg_web NEEDS vpc_id",
          "sg_web ALLOWS port_443",
          "sg_web ALLOWS port_80",
          "sg_web OUTPUTS sg_web_id",
          "sg_web AFTER vpc_main",
          "sg_db USES terraform_security_group",
          "sg_db ALLOWS port_5432",
          "sg_db OUTPUTS sg_db_id",
          "sg_db AFTER sg_web",
          "ec2_web_1 USES terraform_instance",
          "ec2_web_1 NEEDS subnet_pub_id",
          "ec2_web_1 NEEDS sg_web_id",
          "ec2_web_1 OUTPUTS instance_web_1_id",
          "ec2_web_1 COSTS 30_dollars_month",
          "ec2_web_1 AFTER subnet_public",
          "ec2_web_1 AFTER sg_web",
          "ec2_web_2 USES terraform_instance",
          "ec2_web_2 OUTPUTS instance_web_2_id",
          "ec2_web_2 COSTS 30_dollars_month",
          "ec2_web_2 AFTER subnet_public",
          "rds_primary USES terraform_rds",
          "rds_primary NEEDS subnet_priv_id",
          "rds_primary NEEDS sg_db_id",
          "rds_primary OUTPUTS rds_endpoint",
          "rds_primary COSTS 50_dollars_month",
          "rds_primary AFTER subnet_private",
          "rds_primary AFTER sg_db",
          "alb_main USES terraform_alb",
          "alb_main TARGETS instance_web_1_id",
          "alb_main TARGETS instance_web_2_id",
          "alb_main OUTPUTS alb_dns",
          "alb_main COSTS 20_dollars_month",
          "alb_main AFTER ec2_web_1",
          "alb_main AFTER ec2_web_2",
          "route53_record USES terraform_route53",
          "route53_record NEEDS alb_dns",
          "route53_record OUTPUTS dns_name",
          "route53_record AFTER alb_main"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "FOUNDATION: What does vpc_main produce?",
      expected_dsl: `
        @uses vpc_main USES terraform_vpc
        @out vpc_main OUTPUTS vpc_id
        @q1 $uses AND $out
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
      natural_language: "DEPENDENCY: What depends on vpc_main?",
      expected_dsl: `
        @d1 subnet_public AFTER vpc_main
        @d2 subnet_private AFTER vpc_main
        @d3 sg_web AFTER vpc_main
        @p1 $d1 AND $d2
        @q2 $p1 AND $d3
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
      natural_language: "SECURITY: What ports does sg_web allow?",
      expected_dsl: `
        @p1 sg_web ALLOWS port_443
        @p2 sg_web ALLOWS port_80
        @q3 $p1 AND $p2
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
      natural_language: "EC2 PREREQS: What must exist before ec2_web_1?",
      expected_dsl: `
        @a1 ec2_web_1 AFTER subnet_public
        @a2 ec2_web_1 AFTER sg_web
        @q4 $a1 AND $a2
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
      natural_language: "LOAD BALANCER: What does alb_main target?",
      expected_dsl: `
        @t1 alb_main TARGETS instance_web_1_id
        @t2 alb_main TARGETS instance_web_2_id
        @q5 $t1 AND $t2
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
      natural_language: "COST: What is rds_primary monthly cost?",
      expected_dsl: `
        @uses rds_primary USES terraform_rds
        @cost rds_primary COSTS 50_dollars_month
        @q6 $uses AND $cost
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q7",
      natural_language: "DATABASE DEPS: What does rds_primary need?",
      expected_dsl: `
        @n1 rds_primary NEEDS subnet_priv_id
        @n2 rds_primary NEEDS sg_db_id
        @q7 $n1 AND $n2
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
      natural_language: "FINAL: What resource completes infrastructure?",
      expected_dsl: `
        @out route53_record OUTPUTS dns_name
        @after route53_record AFTER alb_main
        @q8 $out AND $afterxyz
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
