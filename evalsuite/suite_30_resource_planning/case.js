/**
 * Test Case: Resource Planning - Cloud Infrastructure Provisioning
 * Tests cloud infrastructure facts: dependencies, outputs, and costs
 * Version: 3.0
 */

module.exports = {
  id: "suite_30_resource_planning",
  name: "Resource Planning - Cloud Infrastructure Provisioning",
  description: "Tests cloud infrastructure facts: dependencies, outputs, and costs.",
  theory_NL: "VPC main uses terraform_vpc outputting vpc_id. Subnet public uses terraform_subnet after vpc_main. Security groups: sg_web allows port 443 and 80. ec2_web_1 costs 30 dollars/month. rds_primary costs 50 dollars/month. alb_main targets the web instances. route53_record outputs dns_name.",
  theory_DSL: [
    "vpc_main USES terraform_vpc",
    "vpc_main OUTPUTS vpc_id",
    "subnet_public USES terraform_subnet",
    "subnet_public AFTER vpc_main",
    "subnet_private AFTER vpc_main",
    "sg_web USES terraform_security_group",
    "sg_web ALLOWS port_443",
    "sg_web ALLOWS port_80",
    "sg_web AFTER vpc_main",
    "sg_db ALLOWS port_5432",
    "ec2_web_1 USES terraform_instance",
    "ec2_web_1 COSTS 30_dollars_month",
    "ec2_web_1 AFTER subnet_public",
    "ec2_web_1 AFTER sg_web",
    "ec2_web_2 COSTS 30_dollars_month",
    "rds_primary USES terraform_rds",
    "rds_primary COSTS 50_dollars_month",
    "rds_primary NEEDS subnet_priv_id",
    "rds_primary NEEDS sg_db_id",
    "alb_main USES terraform_alb",
    "alb_main TARGETS instance_web_1_id",
    "alb_main TARGETS instance_web_2_id",
    "route53_record OUTPUTS dns_name",
    "route53_record AFTER alb_main"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Does vpc_main use terraform_vpc?",
      TASK_DSL: "@q1 vpc_main USES terraform_vpc",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, vpc_main uses terraform_vpc."
    },
    {
      id: "q2",
      TASK_NL: "Does subnet_public come after vpc_main?",
      TASK_DSL: "@q2 subnet_public AFTER vpc_main",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, subnet_public comes after vpc_main."
    },
    {
      id: "q3",
      TASK_NL: "Does sg_web allow port 443?",
      TASK_DSL: "@q3 sg_web ALLOWS port_443",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, sg_web allows port 443."
    },
    {
      id: "q4",
      TASK_NL: "Does ec2_web_1 come after subnet_public?",
      TASK_DSL: "@q4 ec2_web_1 AFTER subnet_public",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, ec2_web_1 comes after subnet_public."
    },
    {
      id: "q5",
      TASK_NL: "Does alb_main target instance_web_1_id?",
      TASK_DSL: "@q5 alb_main TARGETS instance_web_1_id",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, alb_main targets instance_web_1_id."
    },
    {
      id: "q6",
      TASK_NL: "What is rds_primary cost?",
      TASK_DSL: "@q6 rds_primary COSTS 50_dollars_month",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "rds_primary costs 50 dollars per month."
    },
    {
      id: "q7",
      TASK_NL: "Does rds_primary need subnet_priv_id?",
      TASK_DSL: "@q7 rds_primary NEEDS subnet_priv_id",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, rds_primary needs subnet_priv_id."
    },
    {
      id: "q8",
      TASK_NL: "Does route53_record output dns_name?",
      TASK_DSL: "@q8 route53_record OUTPUTS dns_name",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, route53_record outputs dns_name."
    }
  ],
};
