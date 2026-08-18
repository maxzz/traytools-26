package syncops

import (
	"encoding/json"
	"testing"
)

func TestFolderPairRequestSkipPatternsJSON(t *testing.T) {
	var missing FolderPairRequest
	if err := json.Unmarshal([]byte(`{"sourceFolder":"a","destFolder":"b"}`), &missing); err != nil {
		t.Fatal(err)
	}
	if missing.SkipPatterns != nil {
		t.Fatalf("omitted skipPatterns must be nil (defaults), got %#v", missing.SkipPatterns)
	}

	var empty FolderPairRequest
	if err := json.Unmarshal([]byte(`{"sourceFolder":"a","destFolder":"b","skipPatterns":[]}`), &empty); err != nil {
		t.Fatal(err)
	}
	if empty.SkipPatterns == nil {
		t.Fatal("skipPatterns:[] must not be nil — empty means copy everything")
	}
	if len(*empty.SkipPatterns) != 0 {
		t.Fatalf("skipPatterns:[] must be empty, got %#v", *empty.SkipPatterns)
	}

	var custom FolderPairRequest
	if err := json.Unmarshal([]byte(`{"sourceFolder":"a","destFolder":"b","skipPatterns":["^build$"]}`), &custom); err != nil {
		t.Fatal(err)
	}
	if custom.SkipPatterns == nil || len(*custom.SkipPatterns) != 1 || (*custom.SkipPatterns)[0] != "^build$" {
		t.Fatalf("custom skipPatterns, got %#v", custom.SkipPatterns)
	}
}
