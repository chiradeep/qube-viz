/*
Copyright 2016 Citrix Systems, Inc
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
package main

import (
	"bufio"
	"fmt"
	//"log"
	"gopkg.in/redis.v4"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

type Edge struct {
	src   string
	dst   string
	dport string
}

func newRedisClient() *redis.Client {
	host := "redis-viz"
	if os.Getenv("GET_HOSTS_FROM") == "env" {
		host = os.Getenv("REDIS_VIZ_SERVICE_HOST")
	}
	host = host + ":6379"
	client := redis.NewClient(&redis.Options{
		Addr:     host,
		Password: "",
		DB:       0,
	})
	return client
}

func storeEdges(c chan string) {
	client := newRedisClient()
	for edge := range c {
		edges := strings.Split(edge, ",")

		err := client.SAdd("edges", edge).Err()
		if err != nil {
			fmt.Println("Failed to send edge data to redis")
			fmt.Println("Will try again later")
		}

		err = client.SAdd("ips", edges[0], edges[1]).Err()
		if err != nil {
			fmt.Println("Failed to send ip data to redis")
			fmt.Println("Will try again later")
		}
		//fmt.Println("sent ip to redis")
	}
}

func scanOutput(output io.Reader, c chan string) {

	//scan input lines of the form and extract src and dst
	//tcp      6 431984 ESTABLISHED src=172.20.0.53 dst=172.20.0.9 sport=48631 dport=443 src=172.20.0.9 dst=172.20.0.53 sport=443 dport=48631 [ASSURED] mark=0 use=1

	scanner := bufio.NewScanner(output)

	numEdges := 0
	var edges = make(map[Edge]struct{})
	for scanner.Scan() {
		var src, dst, dport string
		fields := strings.Fields(scanner.Text())
		for _, f := range fields {
			if strings.Contains(f, "src") {
				fields2 := strings.Split(f, "=")
				src = fields2[1]
			}
			if strings.Contains(f, "dst") {
				fields2 := strings.Split(f, "=")
				dst = fields2[1]
			}
			if strings.Contains(f, "dport") {
				fields2 := strings.Split(f, "=")
				dport = fields2[1]
			}
			if src != "" && dst != "" && dport != "" {
				if strings.HasPrefix(src, "127") || strings.HasPrefix(src, "169") {
					break
				}
				if strings.HasPrefix(dst, "127") || strings.HasPrefix(dst, "169") {
					break
				}
				//fmt.Println( src + ", " + dst  + ", " + dport)
				edge := Edge{src: src, dst: dst, dport: dport}

				_, ok := edges[edge]
				if !ok {
					edges[edge] = struct{}{}
					numEdges += 1
					e := src + "," + dst + "," + dport
					c <- e
				}
				break
			}
		}
	}
	fmt.Printf("Added %d edges\n", numEdges)
	if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func main() {

	cmdName := "/usr/sbin/conntrack"
	cmdArgs := []string{"-L"}

	c := make(chan string, 100)
	go storeEdges(c)

	for {
		cmd := exec.Command(cmdName, cmdArgs...)
		cmdReader, err := cmd.StdoutPipe()
		if err != nil {
			fmt.Fprintln(os.Stderr, "Error creating StdoutPipe for Cmd", err)
			os.Exit(1)
		}

		err = cmd.Start()
		if err != nil {
			fmt.Fprintln(os.Stderr, "Error starting Cmd", err)
			os.Exit(1)
		}

		fmt.Println("******** calling scan****")
		scanOutput(cmdReader, c)

		err = cmd.Wait()
		if err != nil {
			fmt.Fprintln(os.Stderr, "Error waiting for Cmd", err)
			os.Exit(1)
		}
		time.Sleep(10 * time.Second)
	}
}
