package dpagent

// IntegrityLevel mirrors the legacy UACLEVEL::type_t glyphs shown on the
// DPAgent toolbar (NA / ? / H / M / M+ / L).
type IntegrityLevel string

const (
	IntegrityNA         IntegrityLevel = "na"
	IntegrityUndetected IntegrityLevel = "undetected"
	IntegrityHigh       IntegrityLevel = "high"
	IntegrityMedium     IntegrityLevel = "medium"
	IntegrityMediumPlus IntegrityLevel = "mediumplus"
	IntegrityLow        IntegrityLevel = "low"
)

// Status is the monitor snapshot polled while the DPAgent toolbar is visible.
type Status struct {
	Running         bool           `json:"running"`
	AgentIntegrity  IntegrityLevel `json:"agentIntegrity"`
	SelfIntegrity   IntegrityLevel `json:"selfIntegrity"`
	AgentPath       string         `json:"agentPath,omitempty"`
}

const Group = "dpagent"
