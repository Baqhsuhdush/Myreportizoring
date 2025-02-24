package kz.enu.restvt.restexample.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.enu.restvt.restexample.entities.ParticipationDto;
import kz.enu.restvt.restexample.entities.Player;
import kz.enu.restvt.restexample.entities.SportClub;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping()
public class SportController {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private List<Player> players = new ArrayList<>();
    private List<SportClub> sportClubs = new ArrayList<>();

    @PostMapping("/players")
    public ResponseEntity<String> addPlayer(@RequestBody Player player) {
        if (players.stream().anyMatch(p -> p.getPlayerid() == player.getPlayerid())) {
            return ResponseEntity.badRequest().body("Player with this ID already exists.");
        }
        players.add(player);
        return ResponseEntity.ok("Player added successfully.");
    }

    @GetMapping("/playerdatas")
    public ResponseEntity<List<Player>> getPlayers() {
        return ResponseEntity.ok(players);
    }

    @DeleteMapping("/players/{id}")
    public ResponseEntity<String> deletePlayer(@PathVariable int id) {
        players.removeIf(p -> p.getPlayerid() == id);
        return ResponseEntity.ok("Player deleted successfully.");
    }

    @PostMapping("/sport_clubs")
    public ResponseEntity<String> addSportClub(@RequestBody SportClub sportClub) {
        if (sportClubs.stream().anyMatch(sc -> sc.getId() == sportClub.getId())) {
            return ResponseEntity.badRequest().body("Sport Club with this ID already exists.");
        }
        sportClubs.add(sportClub);
        return ResponseEntity.ok("Sport Club added successfully.");
    }

    @GetMapping("/sport_clubs_datas")
    public ResponseEntity<List<SportClub>> getSportClubs() {
            return ResponseEntity.ok(sportClubs);
    }

    @DeleteMapping("/sport_clubs/{id}")
    public ResponseEntity<String> deleteSportClub(@PathVariable int id) {
        sportClubs.removeIf(sc -> sc.getId() == id);
        return ResponseEntity.ok("Sport Club deleted successfully.");
    }

    @PostMapping("/participates_in_sports")
    public ResponseEntity<String> addParticipation(@RequestBody ParticipationDto participation) {
        Player foundPlayer = players.stream()
                .filter(p -> p.getPlayerid() == participation.getPlayerId())
                .findFirst()
                .orElse(null);

        SportClub foundClub = sportClubs.stream()
                .filter(sc -> sc.getId() == participation.getSportClubId())
                .findFirst()
                .orElse(null);

        if (foundPlayer == null || foundClub == null) {
            return ResponseEntity.badRequest().body("Player or Sport Club not found.");
        }

        foundPlayer.setSport(foundClub);
        return ResponseEntity.ok("Player participation updated successfully.");
    }

    @GetMapping("/full_info")
    public ResponseEntity<String> getFullInfo() {
        try {
            String json = objectMapper.writeValueAsString(new Object() {
                public final List<Player> players = SportController.this.players;
                public final List<SportClub> sportClubs = SportController.this.sportClubs;
            });
            return ResponseEntity.ok(json);
        } catch (JsonProcessingException e) {
            return ResponseEntity.internalServerError().body("JSON processing error.");
        }
    }
}
