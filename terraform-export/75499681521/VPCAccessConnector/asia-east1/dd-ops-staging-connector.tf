resource "google_vpc_access_connector" "dd_ops_staging_connector" {
  ip_cidr_range  = "10.8.0.0/28"
  machine_type   = "e2-micro"
  max_instances  = 10
  max_throughput = 1000
  min_instances  = 2
  min_throughput = 200
  name           = "dd-ops-staging-connector"
  network        = "dd-ops-vpc"
  project        = "75499681521"
  region         = "asia-east1"
}
# terraform import google_vpc_access_connector.dd_ops_staging_connector projects/75499681521/locations/asia-east1/connectors/dd-ops-staging-connector
