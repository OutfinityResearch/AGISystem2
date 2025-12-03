/**
 * Test Case: Comprehensive Cloud Infrastructure - Dependency & Cost Analysis
 * Tests infrastructure provisioning order, cost analysis, and dependency chains
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_30_resource_planning",
  name: "Comprehensive Cloud Infrastructure - Dependency & Cost Analysis",

  theory_NL: "Cloud infrastructure with VPC, subnets, security groups, instances, database, load balancer, DNS. vpc_main is foundation ($0), all network components depend on it. subnet_public and subnet_private after vpc ($5 each). sg_web and sg_db after vpc ($2 each). ec2_web_1 and ec2_web_2 after subnet_public and sg_web ($30 each). rds_primary after subnet_private and sg_db ($50). alb_main after ec2 instances ($25). route53_record after alb ($1). Resource types: vpc,subnet are network_resource; sg is security_resource; ec2 is compute_resource; rds is database_resource; alb is loadbalancer_resource; route53 is dns_resource.",

  theory_DSL: [
    "vpc_main USES terraform_vpc", "vpc_main OUTPUTS vpc_id", "vpc_main COSTS 0", "vpc_main IS_A network_resource",
    "subnet_public USES terraform_subnet", "subnet_public AFTER vpc_main", "subnet_public OUTPUTS public_subnet_id", "subnet_public COSTS 5", "subnet_public IS_A network_resource",
    "subnet_private USES terraform_subnet", "subnet_private AFTER vpc_main", "subnet_private OUTPUTS private_subnet_id", "subnet_private COSTS 5", "subnet_private IS_A network_resource",
    "sg_web USES terraform_security_group", "sg_web AFTER vpc_main", "sg_web ALLOWS port_443", "sg_web ALLOWS port_80", "sg_web OUTPUTS sg_web_id", "sg_web COSTS 2", "sg_web IS_A security_resource",
    "sg_db USES terraform_security_group", "sg_db AFTER vpc_main", "sg_db ALLOWS port_5432", "sg_db OUTPUTS sg_db_id", "sg_db COSTS 2", "sg_db IS_A security_resource",
    "ec2_web_1 USES terraform_instance", "ec2_web_1 AFTER subnet_public", "ec2_web_1 AFTER sg_web", "ec2_web_1 OUTPUTS instance_web_1_id", "ec2_web_1 COSTS 30", "ec2_web_1 IS_A compute_resource",
    "ec2_web_2 USES terraform_instance", "ec2_web_2 AFTER subnet_public", "ec2_web_2 AFTER sg_web", "ec2_web_2 OUTPUTS instance_web_2_id", "ec2_web_2 COSTS 30", "ec2_web_2 IS_A compute_resource",
    "rds_primary USES terraform_rds", "rds_primary AFTER subnet_private", "rds_primary AFTER sg_db", "rds_primary OUTPUTS rds_endpoint", "rds_primary COSTS 50", "rds_primary IS_A database_resource",
    "alb_main USES terraform_alb", "alb_main AFTER ec2_web_1", "alb_main AFTER ec2_web_2", "alb_main TARGETS instance_web_1_id", "alb_main TARGETS instance_web_2_id", "alb_main OUTPUTS alb_dns", "alb_main COSTS 25", "alb_main IS_A loadbalancer_resource",
    "route53_record USES terraform_route53", "route53_record AFTER alb_main", "route53_record OUTPUTS dns_name", "route53_record COSTS 1", "route53_record IS_A dns_resource",
    "network_resource IS_A infrastructure_resource", "security_resource IS_A infrastructure_resource", "compute_resource IS_A infrastructure_resource",
    "database_resource IS_A infrastructure_resource", "loadbalancer_resource IS_A infrastructure_resource", "dns_resource IS_A infrastructure_resource",
    "infrastructure_resource IS_A cloud_resource", "cloud_resource IS_A managed_service"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Trace provisioning order: vpc → dns_name",
      TASK_DSL: "@q1 vpc_main PROVISIONS route53_record",
      ANSWEAR_NL: "vpc→(subnets,sgs)→(ec2s,rds)→alb→route53. 10 resources in dependency order.",
      PROOF_DSL: `@p1 vpc_main OUTPUTS vpc_id
@p2 subnet_public AFTER vpc_main
@p3 subnet_private AFTER vpc_main
@p4 sg_web AFTER vpc_main
@p5 sg_db AFTER vpc_main
@p6 ec2_web_1 AFTER subnet_public
@p7 ec2_web_1 AFTER sg_web
@p8 rds_primary AFTER subnet_private
@p9 alb_main AFTER ec2_web_1
@p10 route53_record AFTER alb_main
@p11 route53_record OUTPUTS dns_name
@c1 $p1 LEADS_TO $p2
@c2 $p2 LEADS_TO $p6
@c3 $p6 LEADS_TO $p9
@c4 $p9 LEADS_TO $p10
@c5 $p10 LEADS_TO $p11
@chain $c5 COMPLETES trace
@result $chain IS_A provisioning_order_proof
@proof $result PROVES $q1`,
      PROOF_NL: "5 layers: vpc→network/sg→compute/db→alb→dns. 10 resources total."
    },
    {
      id: "q2", TASK_NL: "What is total monthly cost?",
      TASK_DSL: "@q2 infrastructure COSTS 150",
      ANSWEAR_NL: "vpc(0)+subnets(10)+sgs(4)+ec2s(60)+rds(50)+alb(25)+route53(1) = $150/month.",
      PROOF_DSL: `@p1 vpc_main COSTS 0
@p2 subnet_public COSTS 5
@p3 subnet_private COSTS 5
@p4 sg_web COSTS 2
@p5 sg_db COSTS 2
@p6 ec2_web_1 COSTS 30
@p7 ec2_web_2 COSTS 30
@p8 rds_primary COSTS 50
@p9 alb_main COSTS 25
@p10 route53_record COSTS 1
@c1 $p1 LEADS_TO $p2
@c2 $p2 LEADS_TO $p3
@c3 $p3 LEADS_TO $p4
@c4 $p4 LEADS_TO $p5
@c5 $p5 LEADS_TO $p6
@c6 $p6 LEADS_TO $p7
@c7 $p7 LEADS_TO $p8
@c8 $p8 LEADS_TO $p9
@c9 $p9 LEADS_TO $p10
@total $c9 SUMS 150
@result $total IS_A cost_aggregation_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Total: 0+10+4+60+50+25+1 = $150/month."
    },
    {
      id: "q3", TASK_NL: "What depends on vpc_main? (Direct dependencies)",
      TASK_DSL: "@q3 vpc_main HAS dependents",
      ANSWEAR_NL: "subnet_public, subnet_private, sg_web, sg_db all directly depend on vpc. 4 direct dependents.",
      PROOF_DSL: `@p1 subnet_public AFTER vpc_main
@p2 subnet_private AFTER vpc_main
@p3 sg_web AFTER vpc_main
@p4 sg_db AFTER vpc_main
@c1 $p1 ESTABLISHES dependent_1
@c2 $p2 ESTABLISHES dependent_2
@c3 $p3 ESTABLISHES dependent_3
@c4 $p4 ESTABLISHES dependent_4
@all $c1 COMBINES $c4
@result $all IS_A dependency_analysis_proof
@proof $result PROVES $q3`,
      PROOF_NL: "4 direct dependents: subnet_public, subnet_private, sg_web, sg_db."
    },
    {
      id: "q4", TASK_NL: "What if vpc_main fails? (Full cascade)",
      TASK_DSL: "@q4 vpc_main BLOCKS downstream",
      ANSWEAR_NL: "vpc failure cascades to ALL other resources. 9 resources blocked. Complete infrastructure failure.",
      PROOF_DSL: `@p1 vpc_main OUTPUTS vpc_id
@p2 subnet_public AFTER vpc_main
@p3 subnet_private AFTER vpc_main
@p4 sg_web AFTER vpc_main
@p5 sg_db AFTER vpc_main
@p6 ec2_web_1 AFTER subnet_public
@p7 rds_primary AFTER subnet_private
@p8 alb_main AFTER ec2_web_1
@p9 route53_record AFTER alb_main
@c1 $p1 BLOCKS $p2
@c2 $p2 BLOCKS $p6
@c3 $p6 BLOCKS $p8
@c4 $p8 BLOCKS $p9
@c5 $p1 BLOCKS $p3
@c6 $p3 BLOCKS $p7
@cascade $c4 CONFIRMS failure
@result $cascade IS_A failure_cascade_proof
@proof $result PROVES $q4`,
      PROOF_NL: "VPC is root. Failure blocks all 9 downstream resources. Total infrastructure failure."
    },
    {
      id: "q5", TASK_NL: "Is ec2_web_1 a managed_service? (Deep hierarchy)",
      TASK_DSL: "@q5 ec2_web_1 IS_A managed_service",
      ANSWEAR_NL: "ec2_web_1→compute_resource→infrastructure_resource→cloud_resource→managed_service. 4-step chain.",
      PROOF_DSL: `@p1 ec2_web_1 IS_A compute_resource
@p2 compute_resource IS_A infrastructure_resource
@p3 infrastructure_resource IS_A cloud_resource
@p4 cloud_resource IS_A managed_service
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@chain $c3 REACHES managed_service
@result $chain IS_A transitive_inheritance_proof
@proof $result PROVES $q5`,
      PROOF_NL: "4-step: ec2→compute→infrastructure→cloud→managed_service."
    },
    {
      id: "q6", TASK_NL: "What resources can provision in parallel after vpc?",
      TASK_DSL: "@q6 vpc_main ENABLES parallel",
      ANSWEAR_NL: "subnet_public, subnet_private, sg_web, sg_db can all provision in parallel (same dependency, no interdependence).",
      PROOF_DSL: `@p1 subnet_public AFTER vpc_main
@p2 subnet_private AFTER vpc_main
@p3 sg_web AFTER vpc_main
@p4 sg_db AFTER vpc_main
@c1 $p1 SHARES vpc_main
@c2 $p2 SHARES vpc_main
@c3 $p3 SHARES vpc_main
@c4 $p4 SHARES vpc_main
@independent $c1 CONFIRMS parallel
@result $independent IS_A parallelism_proof
@proof $result PROVES $q6`,
      PROOF_NL: "4 parallel after vpc: subnets and security groups (no interdependencies)."
    },
    {
      id: "q7", TASK_NL: "What is the cost breakdown by resource type?",
      TASK_DSL: "@q7 costs GROUPED_BY type",
      ANSWEAR_NL: "network: $10, security: $4, compute: $60, database: $50, loadbalancer: $25, dns: $1.",
      PROOF_DSL: `@p1 subnet_public COSTS 5
@p2 subnet_private COSTS 5
@p3 sg_web COSTS 2
@p4 sg_db COSTS 2
@p5 ec2_web_1 COSTS 30
@p6 ec2_web_2 COSTS 30
@p7 rds_primary COSTS 50
@p8 alb_main COSTS 25
@p9 route53_record COSTS 1
@c1 $p1 ADDS $p2
@c2 $p3 ADDS $p4
@c3 $p5 ADDS $p6
@c4 $c1 GROUPS network
@c5 $c2 GROUPS security
@c6 $c3 GROUPS compute
@breakdown $c6 COMPLETES analysis
@result $breakdown IS_A cost_breakdown_proof
@proof $result PROVES $q7`,
      PROOF_NL: "By type: network $10, security $4, compute $60, database $50, lb $25, dns $1."
    },
    {
      id: "q8", TASK_NL: "What is the minimum path to provision route53_record?",
      TASK_DSL: "@q8 route53_record REQUIRES minimum_path",
      ANSWEAR_NL: "vpc→subnet_public→sg_web→ec2_web_1→alb_main→route53_record = 6 steps minimum.",
      PROOF_DSL: `@p1 vpc_main OUTPUTS vpc_id
@p2 subnet_public AFTER vpc_main
@p3 sg_web AFTER vpc_main
@p4 ec2_web_1 AFTER subnet_public
@p5 ec2_web_1 AFTER sg_web
@p6 alb_main AFTER ec2_web_1
@p7 route53_record AFTER alb_main
@c1 $p1 LEADS_TO $p2
@c2 $p2 LEADS_TO $p4
@c3 $p4 LEADS_TO $p6
@c4 $p6 LEADS_TO $p7
@path $c4 COMPLETES minimum
@result $path IS_A minimum_path_proof
@proof $result PROVES $q8`,
      PROOF_NL: "5 sequential layers: vpc→(subnet+sg)→ec2→alb→route53. Subnet and sg can parallel."
    }
  ]
};
