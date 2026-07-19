package main

import (
	"context"
	"fmt"
)

func main() {
	ctx := context.TODO()
	_ = context.WithoutCancel(ctx)
	fmt.Println("success")
}
