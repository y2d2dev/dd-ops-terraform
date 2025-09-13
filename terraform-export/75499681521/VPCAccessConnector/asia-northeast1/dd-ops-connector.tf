resource "google_vpc_access_connector" "dd_ops_connector" {
  ip_cidr_range  = "10.0.1.0/28"
  machine_type   = "e2-micro"
  max_instances  = 10
  max_throughput = 1000
  min_instances  = 2
  min_throughput = 200
  name           = "dd-ops-connector"
  network        = "dd-ops-vpc"
  project        = "75499681521"
  region         = "asia-northeast1"
}
# terraform import google_vpc_access_connector.dd_ops_connector projects/75499681521/locations/asia-northeast1/connectors/dd-ops-connector
